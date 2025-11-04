import { exec } from 'node:child_process'
import fs from 'node:fs'
import * as opentype from 'opentype.js'

interface UnicodeCharacterSet {
  unicodeCodes: number[]
  totalCharacters: number
  characterMap: Map<number, string>
}

/**
 * Loads a TTF font and extracts all Unicode code points
 * @param fontPath - Path to the TTF/OTF font file
 * @returns Promise with Unicode character set information
 */
async function loadFontAndGetUnicodeSet(fontPath: string): Promise<UnicodeCharacterSet> {
  return new Promise((resolve, reject) => {
    opentype.load(fontPath, (err: Error | null, font?: opentype.Font) => {
      if (err || !font) {
        reject(err || new Error('Failed to load font'))
        return
      }

      const unicodeSet = new Set<number>()
      const characterMap = new Map<number, string>()

      // Iterate through all glyphs in the font
      const glyphs = font.glyphs

      for (let i = 0; i < glyphs.length; i++) {
        const glyph = glyphs.get(i)

        // Check for single unicode value
        if (glyph.unicode !== undefined) {
          unicodeSet.add(glyph.unicode)
          characterMap.set(glyph.unicode, String.fromCodePoint(glyph.unicode))
        }

        // Check for multiple unicode values (some glyphs map to multiple code points)
        if (glyph.unicodes && glyph.unicodes.length > 0) {
          for (const code of glyph.unicodes) {
            unicodeSet.add(code)
            characterMap.set(code, String.fromCodePoint(code))
          }
        }
      }

      // Convert to sorted array
      const unicodeCodes = Array.from(unicodeSet).sort((a, b) => a - b)

      resolve({
        unicodeCodes,
        totalCharacters: unicodeCodes.length,
        characterMap,
      })
    })
  })
}

async function createCharsTxt(paths: {
  input: { fontTtf: string }
  output: { charsTxt: string }
}): Promise<void> {
  // Get all Unicode code points
  const characterSet = await loadFontAndGetUnicodeSet(paths.input.fontTtf)

  const chars = Array.from(characterSet.characterMap.values())

  const str = chars.join(' ')

  // escape backslashes and quotes
  const escapedStr = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  fs.writeFileSync(paths.output.charsTxt, `"${escapedStr}"`)
}

async function generateAtlas(paths: {
  input: { fontTtf: string; charsTxt: string }
  output: { atlasPng: string; fntJson: string }
}): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `.\\msdf-atlas-gen.exe -font "${paths.input.fontTtf}" -charset "${paths.input.charsTxt}" -uniformgrid -uniformcell 37 45 -uniformorigin on -pxalign horizontal -imageout "${paths.output.atlasPng}" -json "${paths.output.fntJson}"`,
      (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing msdf-atlas-gen: ${error.message}`)
          return
        }
        if (stderr) {
          console.log(stderr)
        }
        console.log(`msdf-atlas-gen output: ${stdout}`)
        resolve()
      },
    )
  })
}

function createUnicodeMap(paths: {
  input: { fntJson: string }
  output: { unicodeMapJson: string }
}): void {
  const fntData = fs.readFileSync(paths.input.fntJson)
  const fnt = JSON.parse(fntData.toString())

  const { cellWidth, cellHeight, columns, rows } = fnt.atlas.grid
  const { height } = fnt.atlas

  const charMap: { [key: number]: number } = {}
  for (let i = 0; i < fnt.glyphs.length; i++) {
    const char = fnt.glyphs[i]
    if (!char.atlasBounds) continue

    const { left, top, bottom, right } = char.atlasBounds

    const x = left + (right - left) / 2
    const y = height - (bottom + (top - bottom) / 2)

    const col = Math.floor(x / cellWidth)
    const row = Math.floor(y / cellHeight)

    const index = row * columns + col

    charMap[char.unicode] = index
  }

  const space = ' '.charCodeAt(0)
  charMap[space] = rows * columns - 1

  fs.writeFileSync(paths.output.unicodeMapJson, JSON.stringify(charMap, null, 2))
}

// Example usage
async function main(fontTtf: string, outDir: string) {
  const charsTxt = `${outDir}/chars.txt`
  const atlasPng = `${outDir}/atlas.png`
  const fntJson = `${outDir}/fnt.json`
  const unicodeMapJson = `${outDir}/unicodeMap.json`

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
  fs.mkdirSync(outDir, { recursive: true })

  try {
    await createCharsTxt({ input: { fontTtf }, output: { charsTxt } })

    await generateAtlas({
      input: { fontTtf, charsTxt },
      output: { atlasPng, fntJson },
    })

    createUnicodeMap({
      input: { fntJson },
      output: { unicodeMapJson },
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

main('CascadiaMono.ttf', './out')

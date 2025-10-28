import './happydom'

import fs from 'node:fs'
import figlet from 'figlet'
import opentype from 'opentype.js'

function scalePath(path: opentype.Path, scale: number) {
  for (const cmd of path.commands) {
    if ('x' in cmd && 'y' in cmd) {
      cmd.x *= scale
      cmd.y *= scale
    }
    if ('x1' in cmd && 'y1' in cmd) {
      cmd.x1 *= scale
      cmd.y1 *= scale
    }
    if ('x2' in cmd && 'y2' in cmd) {
      cmd.x2 *= scale
      cmd.y2 *= scale
    }
  }
}

function translatePath(path: opentype.Path, dx: number, dy: number) {
  for (const cmd of path.commands) {
    if ('x' in cmd && 'y' in cmd) {
      cmd.x += dx
      cmd.y += dy
    }
    if ('x1' in cmd && 'y1' in cmd) {
      cmd.x1 += dx
      cmd.y1 += dy
    }
    if ('x2' in cmd && 'y2' in cmd) {
      cmd.x2 += dx
      cmd.y2 += dy
    }
  }
}

async function asciiToGlyph(
  char: string,
  glyphFont: opentype.Font,
  figletFont: string,
  cellWidth: number,
  cellHeight: number,
  baseline: number,
  height: number,
): Promise<opentype.Glyph | null> {
  const art = await figlet.text(char, { font: figletFont })

  if (art.trim().length === 0 && char !== ' ') {
    return null
  }

  const lines = art.split('\n')

  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)

  const fontSize = glyphFont.unitsPerEm

  const path = new opentype.Path()

  const yShift = glyphFont.descender / fontSize

  const lineSpacing = 1.2

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y]

    for (let x = 0; x < line.length; x++) {
      const symbol = line[x]

      if (symbol === ' ') continue

      const charGlyph = glyphFont.charToGlyph(symbol)

      const charPath = charGlyph.getPath(0, 0, fontSize, { yScale: -1 })

      scalePath(charPath, cellHeight / fontSize / lineSpacing)
      translatePath(charPath, x * cellWidth, (baseline - y - yShift - 1) * cellHeight)

      path.extend(charPath)
    }
  }

  return new opentype.Glyph({
    name: char,
    unicode: char.codePointAt(0),
    advanceWidth: maxLineLength * cellWidth,
    yMax: baseline * cellHeight,
    yMin: (baseline - height) * cellHeight,
    xMin: 0,
    xMax: maxLineLength * cellWidth,
    path,
  })
}

async function main() {
  const figletFont = 'Reeko Font 1'

  const fontBuffer = fs.readFileSync('./cascadiaMono.ttf')
  const glyphFont = opentype.parse(fontBuffer.buffer)

  const result = await figlet.metadata(figletFont)
  const metadata = result?.[0]

  if (!metadata) {
    throw new Error(`No metadata for ${figletFont} font`)
  }

  const { height, baseline } = metadata

  if (!height || height % 2 !== 0) {
    throw new Error(`Font height must be even. Got height=${height}`)
  }

  console.log('Font height:', height)

  if (!baseline || baseline <= 0) {
    throw new Error(`Font baseline must be positive. Got baseline=${baseline}`)
  }

  // load chars.txt
  const alphabetStr = fs.readFileSync('./chars.txt', 'utf-8')

  const alphabet = alphabetStr.split(' ')
  alphabet.push(' ')

  const spaceGlyph = glyphFont.charToGlyph(' ')
  const spaceAdvance = spaceGlyph.advanceWidth
  if (!spaceAdvance) {
    throw new Error('Space glyph has no advance width')
  }

  const cellHeight = glyphFont.unitsPerEm / height
  const cellWidth = cellHeight / 2

  const glyphs = [
    new opentype.Glyph({
      name: '.notdef',
      advanceWidth: spaceGlyph.advanceWidth!,
      path: new opentype.Path(),
    }),
  ]

  for (const char of alphabet) {
    if (char.length > 1) {
      continue
    }

    const glyph = await asciiToGlyph(char, glyphFont, figletFont, cellWidth, cellHeight, baseline, height)
    if (glyph) {
      glyphs.push(glyph)
    }
  }

  const newFont = new opentype.Font({
    familyName: figletFont,
    styleName: 'Regular',
    unitsPerEm: glyphFont.unitsPerEm,
    ascender: (baseline / height) * glyphFont.unitsPerEm,
    descender: ((baseline - height) / height) * glyphFont.unitsPerEm,
    glyphs: glyphs,
  })

  const yMax = Math.ceil(Math.max(...glyphs.map((g) => (g.yMax !== undefined ? g.yMax : 0))))
  const yMin = Math.floor(Math.min(...glyphs.map((g) => (g.yMin !== undefined ? g.yMin : 0))))

  newFont.tables.os2.usWinAscent = yMax
  newFont.tables.os2.usWinDescent = Math.abs(yMin) // usWinDescent should be positive
  newFont.tables.os2.sTypoAscender = yMax
  newFont.tables.os2.sTypoDescender = yMin // sTypoDescender can be negative

  const buffer = newFont.toArrayBuffer()

  if (!fs.existsSync('./out/fonts')) {
    fs.mkdirSync('./out/fonts', { recursive: true })
  }

  fs.writeFileSync(`./out/fonts/${figletFont.toLowerCase()}.ttf`, Buffer.from(buffer))
}

main()

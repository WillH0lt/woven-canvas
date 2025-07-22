import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { PostUpdateDeleter } from './PostUpdateDeleter'
import { PostUpdateHistory } from './PostUpdateHistory'

function calculateFontSize(text: comps.Text, block: comps.Block): number {
  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.width = `${block.width}px`
  tempDiv.style.fontFamily = text.fontFamily
  tempDiv.style.textAlign = text.align
  tempDiv.style.lineHeight = `${text.lineHeight}`
  tempDiv.innerHTML = text.content
  document.body.appendChild(tempDiv)

  let lineCount = 1
  let fontSize = 0
  while (true) {
    fontSize = block.height / lineCount / text.lineHeight

    tempDiv.style.fontSize = `${fontSize}px`

    const height = tempDiv.clientHeight
    if (height <= block.height) break

    lineCount++
  }

  console.log(lineCount)

  document.body.removeChild(tempDiv)

  return fontSize
}

// function getLines(content: string, fontData: FontData, width: number): string[] {
//   const cleanedContent = content.replaceAll('<p>', '').replaceAll('</p>', '') //.replaceAll('&nbsp;', ' ')

//   console.log(cleanedContent)

//   const words = cleanedContent.split(' ')
//   const wordWidths = words
//     .map((word) => {
//       return word.replaceAll('&nbsp;', ' ')
//     })
//     .map((word) => {
//       return word.split('').reduce((acc, char) => {
//         const charData = fontData.chars[char]
//         if (charData) {
//           return acc + charData.xAdvance
//         }

//         console.warn(`Character "${char}" not found in font data.`)
//         return acc + 0 // Treat missing characters as having zero width
//       }, 0)
//     })

//   console.log('Words:', words)

//   const lines: string[] = []
//   let currentLine = ''
//   let currentWidth = 0

//   for (let i = 0; i < words.length; i++) {
//     const word = words[i]
//     const wordWidth = wordWidths[i]

//     if (currentWidth + wordWidth > width) {
//       lines.push(currentLine.trim())
//       currentLine = ''
//       currentWidth = 0
//     }
//     currentLine += `${word} `
//     currentWidth += wordWidth
//   }

//   lines.push(currentLine.trim())

//   return lines
// }

// function calculateFontSize(text: comps.Text, block: comps.Block): number {
//   const fntData = Registry.instance.getFont(text.fontFamily)
//   if (!fntData) {
//     console.warn(`Font data for "${text.fontFamily}" not found, using default font size.`)
//     return 16 // Default font size
//   }

//   let lineCount = 1
//   let fontSize = 0
//   let lines = []
//   while (true) {
//     fontSize = block.height / lineCount / text.lineHeight

//     const scale = fntData.fontSize / fontSize
//     lines = getLines(text.content, fntData, block.width * scale)

//     if (lines.length <= lineCount || lineCount > 1000) break
//     lineCount++
//   }

//   console.log(lines, lineCount)

//   // console.log(`Calculated font size: ${fontSize} for text: "${text}" with line count: ${lineCount}`)

//   return fontSize
// }

export class PostUpdateFontSizer extends BaseSystem {
  private readonly texts = this.query(
    (q) => q.added.changed.removed.with(comps.Text).trackWrites.using(comps.FontSize).write,
  )

  private readonly blocks = this.query((q) => q.changed.with(comps.Block).trackWrites.with(comps.Text, comps.FontSize))

  public constructor() {
    super()

    this.schedule((s) => s.inAnyOrderWith(PostUpdateHistory).after(PostUpdateDeleter))
  }

  public execute(): void {
    // for (const textEntity of this.texts.added) {
    //   if (textEntity.has(comps.FontSize)) continue
    //   textEntity.add(comps.FontSize)
    //   this.updateFontSize(textEntity)
    // }
    // for (const blockEntity of this.blocks.changed) {
    //   this.updateFontSize(blockEntity)
    // }
  }

  private updateFontSize(textEntity: Entity): void {
    const text = textEntity.read(comps.Text)
    const block = textEntity.read(comps.Block)
    const fontSize = textEntity.write(comps.FontSize)

    if (fontSize.lastBlockWidth !== block.width || fontSize.lastBlockHeight !== block.height) {
      const t1 = performance.now()
      const newFontSize = calculateFontSize(text, block)
      const t2 = performance.now()
      console.debug(`Font size calculation took ${t2 - t1} ms`)
      if (newFontSize !== fontSize.value) {
        fontSize.value = newFontSize
        fontSize.lastBlockWidth = block.width
        fontSize.lastBlockHeight = block.height
      }
    }
  }
}

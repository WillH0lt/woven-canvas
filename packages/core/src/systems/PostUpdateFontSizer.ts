import { BaseSystem, comps } from '@infinitecanvas/core'
import type { Entity } from '@lastolivegames/becsy'
import { PostUpdateDeleter } from './PostUpdateDeleter'
import { PostUpdateHistory } from './PostUpdateHistory'

function calculateFontSize(text: comps.Text, block: comps.Block): number {
  let lines = 1

  const tempDiv = document.createElement('div')
  tempDiv.style.position = 'absolute'
  tempDiv.style.visibility = 'hidden'
  tempDiv.style.whiteSpace = 'pre-wrap'
  tempDiv.style.width = `${block.width}px`
  tempDiv.style.fontFamily = text.fontFamily
  tempDiv.style.textAlign = text.align
  tempDiv.style.lineHeight = `${text.lineHeight}`
  tempDiv.textContent = text.content
  document.body.appendChild(tempDiv)

  while (true) {
    const fontSize = block.height / lines / text.lineHeight
    tempDiv.style.fontSize = `${fontSize}px`
    const totalHeight = tempDiv.scrollHeight
    if (totalHeight <= block.height) {
      document.body.removeChild(tempDiv)
      return fontSize
    }

    lines++

    if (lines > 100) {
      console.warn('Unable to calculate font size, using default value')
      document.body.removeChild(tempDiv)
      return 16 // Default font size
    }
  }
}

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
    for (const textEntity of this.texts.added) {
      if (textEntity.has(comps.FontSize)) continue
      textEntity.add(comps.FontSize)
      this.updateFontSize(textEntity)
    }

    for (const blockEntity of this.blocks.changed) {
      this.updateFontSize(blockEntity)
    }
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

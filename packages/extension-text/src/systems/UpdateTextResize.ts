import { BaseSystem } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'

import type { Entity } from '@lastolivegames/becsy'
import { TextDragStart } from '../components'
import { Text } from '../components'

export class UpdateTextResize extends BaseSystem {
  private readonly selectedTexts = this.query(
    (q) =>
      q.added.changed.removed
        .with(comps.Block)
        .write.trackWrites.with(Text)
        .write.with(comps.Selected)
        .using(TextDragStart).write,
  )

  public execute(): void {
    for (const selectedTextEntity of this.selectedTexts.added) {
      selectedTextEntity.add(TextDragStart)
      this.resetTextDragStart(selectedTextEntity)
    }

    for (const textEntity of this.selectedTexts.changed) {
      const block = textEntity.read(comps.Block)
      const textDragStart = textEntity.write(TextDragStart)

      const sizeChanged = block.height !== textDragStart.lastHeight || block.width !== textDragStart.lastWidth
      if (!sizeChanged) continue

      const isStretching = block.width !== textDragStart.lastWidth && block.height === textDragStart.lastHeight

      if (isStretching) {
        // if ratio has changed then calculate new block size
        this.resizeBlock(textEntity)
      } else {
        // scale the font size proportionally
        const newFontSize = textDragStart.startFontSize * (block.height / textDragStart.startHeight)
        const text = textEntity.write(Text)
        text.fontSize = newFontSize

        textDragStart.lastHeight = block.height
        textDragStart.lastWidth = block.width
      }
    }

    for (const selectedTextEntity of this.selectedTexts.removed) {
      if (!selectedTextEntity.alive) continue
      selectedTextEntity.remove(TextDragStart)
    }
  }

  private resizeBlock(textEntity: Entity): void {
    const block = textEntity.read(comps.Block)
    const element = this.getBlockElementById(block.id)
    const root = element?.shadowRoot?.firstElementChild
    if (!root) return

    // go ahead and update the element size with the new block size
    // and ensure it has the same size as the shadow root
    element.style.width = `${block.width}px`
    element.style.height = `${block.height}px`

    const rect = root.getBoundingClientRect()

    if (rect.height !== block.height || rect.width !== block.width) {
      const writableBlock = textEntity.write(comps.Block)
      writableBlock.height = rect.height
      writableBlock.width = rect.width

      this.resetTextDragStart(textEntity)
    }
  }

  private resetTextDragStart(textEntity: Entity): void {
    const textDragStart = textEntity.write(TextDragStart)
    const block = textEntity.read(comps.Block)

    textDragStart.startHeight = block.height
    textDragStart.startWidth = block.width
    textDragStart.startFontSize = textEntity.read(Text).fontSize
    textDragStart.lastHeight = block.height
    textDragStart.lastWidth = block.width
  }
}

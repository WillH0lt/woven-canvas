import { BaseSystem, type ICText } from '@infinitecanvas/core'
import { Block, Edited, Opacity, Text } from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'
import type { Mesh } from 'three'

import { getLines } from '../helpers/textLayoutCalculator'
import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { RenderScene } from './RenderScene'
import { RenderShapes } from './RenderShapes'

export class RenderText extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly texts = this.query((q) => q.added.addedOrChanged.current.with(Text, Block).trackWrites)

  private readonly editedTexts = this.query((q) => q.added.removed.with(Text, Block, Edited).using(Opacity).write)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(RenderShapes).before(RenderScene))
  }

  private async renderText(textEntity: Entity): Promise<void> {
    const { width, height, id } = textEntity.read(Block)

    const mesh = this.resources.scene.getObjectByName(id) as Mesh | undefined
    if (!mesh) return

    const material = mesh.material as LetterMaterial

    const rows = Math.round(height / this.grid.rowHeight)
    const cols = Math.round(width / this.grid.colWidth)

    const grid = material.grid.value
    grid.x = cols
    grid.y = rows

    const chars = material.chars.value

    const element = document.getElementById(id) as ICText | null

    await element?.updateComplete

    const textContainer = element?.shadowRoot?.firstElementChild as HTMLElement | null
    if (!textContainer) return

    const lines = getLines(textContainer).map((line) => line.text)

    // Clear the character array first
    const space = this.resources.assets.unicodeMap.get(' '.charCodeAt(0)) ?? 0

    chars.image.data.fill(space)

    // Fill the grid with characters from the split lines
    for (let row = 0; row < Math.min(rows, lines.length); row++) {
      const line = lines[row]
      for (let col = 0; col < Math.min(cols, line.length); col++) {
        const gridIndex = row * chars.image.width + col

        const c = line[col]
        const unicodeIndex = this.resources.assets.unicodeMap.get(c.charCodeAt(0)) ?? space
        chars.image.data[gridIndex] = unicodeIndex
      }

      // // fill the rest of the row with spaces
      // for (let col = Math.min(cols, line.length); col < cols; col++) {
      //   const gridIndex = row * chars.image.width + col
      //   chars.image.data[gridIndex] = space
      // }
    }

    chars.needsUpdate = true
  }

  public execute(): void {
    // all text elements start out invisible
    for (const textEntity of this.texts.added) {
      textEntity.add(Opacity, { value: 0 })

      const block = textEntity.read(Block)
      if (block.tag !== 'ic-text') continue

      const element = document.getElementById(block.id)
      if (!element) continue

      // add some styles for the text element
      // element.style.backgroundColor = this.resources.fontData.backgroundColor
      element.style.outline =
        'var(--ic-highlighted-block-outline-width) solid var(--ic-highlighted-block-outline-color)'
      element.style.borderRadius = 'var(--ic-highlighted-block-border-radius)'
    }

    // when editing the text make the text element fully visible
    for (const editedTextEntity of this.editedTexts.added) {
      const opacity = editedTextEntity.write(Opacity)
      opacity.value = 255

      // // hide the mesh while editing
      // const block = editedTextEntity.read(Block)
      // const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      // if (!mesh) continue
      // mesh.visible = false
    }

    // when we stop editing the text, fade it out
    for (const editedTextEntity of this.editedTexts.removed) {
      const opacity = editedTextEntity.write(Opacity)
      opacity.value = 0

      // show the mesh again
      const block = editedTextEntity.read(Block)
      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue
      mesh.visible = true
    }

    for (const textEntity of this.texts.addedOrChanged) {
      this.renderText(textEntity)
    }
  }
}

import { BaseSystem } from '@infinitecanvas/core'
import { Block, Edited, Opacity, Text } from '@infinitecanvas/core/components'
import type { Mesh } from 'three'

import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { PreRenderShapes } from './PreRenderShapes'

export class PreRenderText extends BaseSystem {
  protected declare readonly resources: AsciiResources

  private readonly texts = this.query((q) => q.added.addedOrChanged.current.with(Text, Block).trackWrites)

  private readonly editedTexts = this.query((q) => q.added.removed.with(Text, Block, Edited).using(Opacity).write)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(PreRenderShapes))
  }

  public execute(): void {
    // all texts start out invisible
    for (const textEntity of this.texts.added) {
      textEntity.add(Opacity, { value: 0 })
    }

    // when editing the text, make it visible
    for (const editedTextEntity of this.editedTexts.added) {
      const opacity = editedTextEntity.write(Opacity)
      opacity.value = 255
    }

    // when we stop editing the text, fade it out
    for (const editedTextEntity of this.editedTexts.removed) {
      const opacity = editedTextEntity.write(Opacity)
      opacity.value = 0
    }

    for (const textEntity of this.texts.addedOrChanged) {
      const block = textEntity.read(Block)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const material = mesh.material as LetterMaterial

      const chars = material.chars.value

      const text = textEntity.read(Text).getStringContent()

      for (let i = 0; i < text.length; i++) {
        const c = text[i]
        const index = this.resources.assets.unicodeMap.get(c.charCodeAt(0)) ?? 0
        chars.image.data[i] = index
      }

      chars.needsUpdate = true
    }
  }
}

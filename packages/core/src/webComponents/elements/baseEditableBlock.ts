import { property } from 'lit/decorators/property.js'

import type { Snapshot } from '../../History'
import { ICBaseBlock } from './baseBlock'

export abstract class ICEditableBlock extends ICBaseBlock {
  @property({ type: Boolean, attribute: 'is-editing' })
  isEditing = false

  public abstract getSnapshot(): Snapshot

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties)

    if (changedProperties.has('isEditing')) {
      if (this.isEditing) {
        this.isSelected = false
        this.isHovered = false
      }
    }
  }
}

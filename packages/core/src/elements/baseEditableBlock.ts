import { property } from 'lit/decorators/property.js'

import type { Snapshot } from '../History'
import { ICBaseBlock } from './baseBlock'

export abstract class ICEditableBlock extends ICBaseBlock {
  @property({ type: Boolean })
  public editing = false

  public abstract getSnapshot(): Snapshot

  protected computeBlockDimensions(element: HTMLElement): { width: number; height: number; left: number; top: number } {
    const newWidth = element.clientWidth
    const newHeight = element.clientHeight

    const rect = element.getBoundingClientRect()
    const cx = (rect.left + rect.right) / 2
    const cy = (rect.top + rect.bottom) / 2

    return {
      width: newWidth,
      height: newHeight,
      left: cx - newWidth / 2,
      top: cy - newHeight / 2,
    }
  }
}

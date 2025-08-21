import { BaseSystem, type CoreCommandArgs } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'

import { Text } from '../components'

export class UpdateTextDeleteEmpty extends BaseSystem<CoreCommandArgs> {
  private readonly changedTexts = this.query((q) => q.changed.with(comps.Block).and.with(Text).trackWrites)

  public execute(): void {
    for (const changedTextEntity of this.changedTexts.changed) {
      const block = changedTextEntity.read(comps.Block)
      if (block.tag !== 'ic-text') continue

      const text = changedTextEntity.read(Text)

      // remove all html tags
      const textContent = text.content.replace(/<\/?[^>]+(>|$)/g, '').trim()
      if (textContent === '') {
        this.deleteEntity(changedTextEntity)
      }
    }
  }
}

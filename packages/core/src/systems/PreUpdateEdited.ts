import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import * as comps from '../components'
import type { CoreResources } from '../types'
import type { ICEditableBlock } from '../webComponents'

export class PreUpdateEdited extends BaseSystem<CoreCommandArgs> {
  protected declare readonly resources: CoreResources

  private readonly editedEntities = this.query((q) => q.added.removed.with(comps.Block, comps.Edited))

  public execute(): void {
    for (const entity of this.editedEntities.added) {
      const block = entity.read(comps.Block)

      const element = this.resources.blockContainer.querySelector<ICEditableBlock>(`[id='${block.id}']`)
      if (!element) continue
      element.setAttribute('is-editing', 'true')
    }

    if (this.editedEntities.removed.length > 0) {
      this.accessRecentlyDeletedData()
    }
    for (const entity of this.editedEntities.removed) {
      const block = entity.read(comps.Block)
      const element = this.resources.blockContainer.querySelector<ICEditableBlock>(`[id='${block.id}']`)
      if (!element) continue
      const snapshot = element.getSnapshot()

      element.removeAttribute('is-editing')

      const blockDef = this.getBlockDef(block.tag)
      if (!blockDef) {
        console.warn(`No block definition found for tag: ${block.tag}`)
        continue
      }

      if (blockDef.editOptions.removeWhenTextEmpty && snapshot[block.id].Text) {
        const content = snapshot[block.id].Text.content as string
        const textContent = content.replace(/<\/?[^>]+(>|$)/g, '').trim()
        if (textContent === '') {
          this.emitCommand(CoreCommand.RemoveBlock, block.id)
          continue
        }
      }

      this.emitCommand(CoreCommand.UpdateFromSnapshot, snapshot)
      this.emitCommand(CoreCommand.CreateCheckpoint)
    }
  }
}

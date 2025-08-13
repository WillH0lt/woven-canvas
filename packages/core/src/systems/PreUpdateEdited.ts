import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import type { ICEditableBlock } from '../elements'
import { CoreCommand, type CoreCommandArgs, type CoreResources } from '../types'
import { UpdateBlocks } from './UpdateBlocks'
import { UpdateCamera } from './UpdateCamera'
import { UpdateCursor } from './UpdateCursor'

export class PreUpdateEdited extends BaseSystem<CoreCommandArgs> {
  protected declare readonly resources: CoreResources

  private readonly editedEntities = this.query((q) => q.added.removed.with(comps.Block, comps.Edited))

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCursor, UpdateCamera, UpdateBlocks))
  }

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

      this.emitCommand(CoreCommand.UpdateFromSnapshot, snapshot)
    }
  }
}

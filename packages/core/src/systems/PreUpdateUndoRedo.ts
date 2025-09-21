import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import * as comps from '../components'
import { applyDiff, uuidToNumber } from '../helpers'
import type { CoreResources } from '../types'
import { PreUpdateEdited } from './PreUpdateEdited'

export class PreUpdateUndoRedo extends BaseSystem<CoreCommandArgs> {
  private readonly entities = this.query(
    (q) =>
      q.current.with(comps.Block, comps.Persistent).orderBy((e) => uuidToNumber(e.read(comps.Block).id)).usingAll.write,
  )

  protected declare readonly resources: CoreResources

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(PreUpdateEdited))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.Undo, this.undo.bind(this))
    this.addCommandListener(CoreCommand.Redo, this.redo.bind(this))
  }

  private undo(): void {
    const diff = this.resources.history.undo()
    if (!diff) return

    applyDiff(this, diff, this.entities)
    this.resources.localDB.applyDiff(diff)
  }

  private redo(): void {
    const diff = this.resources.history.redo()
    if (!diff) return

    applyDiff(this, diff, this.entities)
    this.resources.localDB.applyDiff(diff)
  }
}

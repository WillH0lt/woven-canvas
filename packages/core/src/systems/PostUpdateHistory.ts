import type { Query } from '@lastolivegames/becsy'

import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import * as comps from '../components'
import { applyDiff, uuidToNumber } from '../helpers'
import { CoreCommand, type CoreCommandArgs, type CoreResources } from '../types'
import { PostUpdateDeleter } from './PostUpdateDeleter'

export class PostUpdateHistory extends BaseSystem<CoreCommandArgs> {
  private readonly addedQueries = new Map<new () => BaseComponent, Query>()

  private readonly changedQueries = new Map<new () => BaseComponent, Query>()

  private readonly removedQueries = new Map<new () => BaseComponent, Query>()

  private readonly entities = this.query(
    (q) => q.current.with(comps.Persistent).orderBy((e) => uuidToNumber(e.read(comps.Persistent).id)).usingAll.write,
  )

  protected declare readonly resources: CoreResources

  public constructor() {
    super()

    this.schedule((s) => s.after(PostUpdateDeleter))

    const Components = ComponentRegistry.instance.components

    for (const Comp of Components) {
      if (!(Comp.prototype.constructor as typeof BaseComponent).addToHistory) continue

      const added = this.query((q) => q.added.with(comps.Persistent, Comp))
      this.addedQueries.set(Comp, added)

      const changedQuery = this.query((q) => q.changed.with(comps.Persistent, Comp).trackWrites)
      this.changedQueries.set(Comp, changedQuery)

      const removedQuery = this.query((q) => q.removed.with(comps.Persistent, Comp))
      this.removedQueries.set(Comp, removedQuery)
    }
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.Undo, this.undo.bind(this))
    this.addCommandListener(CoreCommand.Redo, this.redo.bind(this))
    this.addCommandListener(CoreCommand.CreateCheckpoint, this.createCheckpoint.bind(this))
  }

  public execute(): void {
    const history = this.resources.history

    history.frameDiff.clear()

    for (const Comp of this.addedQueries.keys()) {
      const query = this.addedQueries.get(Comp)!
      if (query.added.length === 0) continue
      history.addComponents(Comp, query.added)
    }

    for (const Comp of this.changedQueries.keys()) {
      const query = this.changedQueries.get(Comp)!
      if (query.changed.length === 0) continue
      history.updateComponents(Comp, query.changed)
    }

    const hasRemoved = Array.from(this.removedQueries.values()).some((q) => q.removed.length > 0)
    if (hasRemoved) {
      this.accessRecentlyDeletedData(true)
    }
    for (const Comp of this.removedQueries.keys()) {
      const query = this.removedQueries.get(Comp)!
      if (query.removed.length === 0) continue
      history.removeComponents(Comp, query.removed)
    }

    if (this.frame.value === 1) {
      history.reset()
    }

    this.executeCommands()
  }

  private undo(): void {
    const diff = this.resources.history.undo()
    if (!diff) return

    applyDiff(this, diff, this.entities)
  }

  private redo(): void {
    const diff = this.resources.history.redo()
    if (!diff) return

    applyDiff(this, diff, this.entities)
  }

  private createCheckpoint(): void {
    this.resources.history.createCheckpoint()
  }
}

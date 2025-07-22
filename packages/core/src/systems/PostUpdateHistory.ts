import type { Query } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { Registry } from '../Registry'
import * as comps from '../components'
import { applyDiff, uuidToNumber } from '../helpers'
import { CoreCommand, type CoreCommandArgs, type CoreResources, type ISerializable } from '../types'
import { PostUpdateDeleter } from './PostUpdateDeleter'

export class PostUpdateHistory extends BaseSystem<CoreCommandArgs> {
  private readonly addedQueries = new Map<new () => ISerializable, Query>()

  private readonly changedQueries = new Map<new () => ISerializable, Query>()

  private readonly removedQueries = new Map<new () => ISerializable, Query>()

  private readonly entities = this.query(
    (q) => q.current.with(comps.Persistent).orderBy((e) => uuidToNumber(e.read(comps.Persistent).id)).usingAll.write,
  )

  protected declare readonly resources: CoreResources

  public constructor() {
    super()

    this.schedule((s) => s.after(PostUpdateDeleter))

    const Components = Registry.instance.historyComponents

    for (const Component of Components) {
      const added = this.query((q) => q.added.with(comps.Persistent, Component))
      this.addedQueries.set(Component, added)

      const changedQuery = this.query((q) => q.changed.with(comps.Persistent, Component).trackWrites)
      this.changedQueries.set(Component, changedQuery)

      const removedQuery = this.query((q) => q.removed.with(comps.Persistent, Component))
      this.removedQueries.set(Component, removedQuery)
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

    for (const Component of this.addedQueries.keys()) {
      const query = this.addedQueries.get(Component)!
      if (query.added.length === 0) continue
      history.addComponents(Component, query.added)
    }

    for (const Component of this.changedQueries.keys()) {
      const query = this.changedQueries.get(Component)!
      if (query.changed.length === 0) continue
      history.updateComponents(Component, query.changed)
    }

    const hasRemoved = Array.from(this.removedQueries.values()).some((q) => q.removed.length > 0)
    if (hasRemoved) {
      this.accessRecentlyDeletedData(true)
    }
    for (const Component of this.removedQueries.keys()) {
      const query = this.removedQueries.get(Component)!
      if (query.removed.length === 0) continue
      history.removeComponents(Component, query.removed)
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

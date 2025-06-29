import { type Query, System } from '@lastolivegames/becsy'
import { batch } from '@preact/signals-core'
import { ComponentRegistry } from '../ComponentRegistry'
import * as comps from '../components'
import type { CoreResources, ISerializable } from '../types'

export class PostRenderStoreSync extends System {
  private readonly addedQueries: Map<new () => ISerializable, Query> = new Map()

  private readonly changedQueries: Map<new () => ISerializable, Query> = new Map()

  private readonly removedQueries: Map<new () => ISerializable, Query> = new Map()

  private readonly resources!: CoreResources

  public constructor() {
    super()

    const Components = ComponentRegistry.instance.stateComponents

    for (const Component of Components) {
      const addedQuery = this.query((q) => q.added.with(comps.Persistent, Component))
      this.addedQueries.set(Component, addedQuery)

      const changedQuery = this.query((q) => q.changed.with(comps.Persistent, Component).trackWrites)
      this.changedQueries.set(Component, changedQuery)

      const removedQuery = this.query((q) => q.removed.with(comps.Persistent, Component))
      this.removedQueries.set(Component, removedQuery)
    }
  }

  public execute(): void {
    const hasAdded = Array.from(this.addedQueries.values()).some((q) => q.added.length > 0)

    const hasChanged = Array.from(this.changedQueries.values()).some((q) => q.changed.length > 0)

    const hasRemoved = Array.from(this.removedQueries.values()).some((q) => q.removed.length > 0)

    const shouldExecute = hasAdded || hasChanged || hasRemoved

    if (!shouldExecute) return

    batch(() => {
      for (const Component of this.addedQueries.keys()) {
        const query = this.addedQueries.get(Component)!
        if (query.added.length === 0) continue
        this.resources.state.addComponents(Component, query.added)
      }

      for (const Component of this.changedQueries.keys()) {
        const query = this.changedQueries.get(Component)!
        if (query.changed.length === 0) continue
        this.resources.state.updateComponents(Component, query.changed)
      }

      if (hasRemoved) {
        this.accessRecentlyDeletedData(true)
      }
      for (const Component of this.removedQueries.keys()) {
        const query = this.removedQueries.get(Component)!
        if (query.removed.length === 0) continue
        this.resources.state.removeComponents(Component, query.removed)
      }
    })
  }
}

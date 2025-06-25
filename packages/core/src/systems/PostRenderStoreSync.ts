import { type Query, System } from '@lastolivegames/becsy'
import { batch } from '@preact/signals-core'
import { getStateComponents } from '../State'

import * as comps from '../components'
import type { CoreResources, ISerializable } from '../types'

export class PostRenderStoreSync extends System {
  private readonly addedOrChangedQueries: Map<new () => ISerializable, Query> = new Map()

  private readonly removedQueries: Map<new () => ISerializable, Query> = new Map()

  private readonly resources!: CoreResources

  public constructor() {
    super()

    const Components = getStateComponents()

    for (const Component of Components) {
      const addedOrChangedQuery = this.query((q) => q.addedOrChanged.with(comps.SaveToState, Component).trackWrites)
      this.addedOrChangedQueries.set(Component, addedOrChangedQuery)

      const removedQuery = this.query((q) => q.removed.with(comps.SaveToState, Component))
      this.removedQueries.set(Component, removedQuery)
    }
  }

  public execute(): void {
    const hasAddedOrChanged = this.addedOrChangedQueries.values().some((q) => q.addedOrChanged.length > 0)

    const hasRemoved = this.removedQueries.values().some((q) => q.removed.length > 0)

    const shouldExecute = hasAddedOrChanged || hasRemoved

    if (!shouldExecute) return

    batch(() => {
      for (const Component of this.addedOrChangedQueries.keys()) {
        const query = this.addedOrChangedQueries.get(Component)!
        if (query.addedOrChanged.length === 0) continue
        this.resources.state.setComponents(Component, query.addedOrChanged)
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

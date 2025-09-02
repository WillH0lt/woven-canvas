import type { Query } from '@lastolivegames/becsy'
import { batch } from '@preact/signals-core'
import type { BaseComponent } from '../BaseComponent'
import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import { Block } from '../components'
import type { CoreResources } from '../types'

export class PreRenderStoreSync extends BaseSystem {
  private readonly addedQueries: Map<new () => BaseComponent, Query> = new Map()

  private readonly changedQueries: Map<new () => BaseComponent, Query> = new Map()

  private readonly removedQueries: Map<new () => BaseComponent, Query> = new Map()

  private readonly singletonQueries: Map<new () => BaseComponent, Query> = new Map()

  protected declare readonly resources: CoreResources

  public constructor() {
    super()

    const Components = ComponentRegistry.instance.components

    for (const Comp of Components) {
      const addedQuery = this.query((q) => q.added.with(Block, Comp))
      this.addedQueries.set(Comp, addedQuery)

      const changedQuery = this.query((q) => q.changed.with(Block, Comp).trackWrites)
      this.changedQueries.set(Comp, changedQuery)

      const removedQuery = this.query((q) => q.removed.with(Block, Comp))
      this.removedQueries.set(Comp, removedQuery)
    }

    const Singletons = ComponentRegistry.instance.singletons
    for (const SingletonComp of Singletons) {
      const query = this.query((q) => q.addedOrChanged.current.with(SingletonComp).trackWrites)
      this.singletonQueries.set(SingletonComp, query)
    }
  }

  public execute(): void {
    const hasAdded = Array.from(this.addedQueries.values()).some((q) => q.added.length > 0)

    const hasChanged = Array.from(this.changedQueries.values()).some((q) => q.changed.length > 0)

    const hasRemoved = Array.from(this.removedQueries.values()).some((q) => q.removed.length > 0)

    const hasSingletons = Array.from(this.singletonQueries.values()).some((q) => q.addedOrChanged.length > 0)

    const shouldExecute = hasAdded || hasChanged || hasRemoved || hasSingletons

    if (!shouldExecute) return

    batch(() => {
      for (const Comp of this.addedQueries.keys()) {
        const query = this.addedQueries.get(Comp)!
        if (query.added.length === 0) continue
        this.resources.state.addComponents(Comp, query.added)
      }

      for (const Comp of this.changedQueries.keys()) {
        const query = this.changedQueries.get(Comp)!
        if (query.changed.length === 0) continue
        this.resources.state.updateComponents(Comp, query.changed)
      }

      if (hasRemoved) {
        this.accessRecentlyDeletedData(true)
      }
      for (const Comp of this.removedQueries.keys()) {
        const query = this.removedQueries.get(Comp)!
        if (query.removed.length === 0) continue
        this.resources.state.removeComponents(Comp, query.removed)
      }

      for (const SingletonComp of this.singletonQueries.keys()) {
        const query = this.singletonQueries.get(SingletonComp)!
        if (query.addedOrChanged.length === 0) continue
        this.resources.state.setSingleton(SingletonComp, query.addedOrChanged[0])
      }
    })
  }
}

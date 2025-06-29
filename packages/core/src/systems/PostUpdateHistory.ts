import type { Entity, Query } from '@lastolivegames/becsy'
// import { getStateComponents } from '../State'

import { BaseSystem } from '../BaseSystem'
import { ComponentRegistry } from '../ComponentRegistry'
import { History, type HistoryDiff } from '../History'
import * as comps from '../components'
import { BlockCommand, type BlockCommandArgs, type CoreResources, type ISerializable } from '../types'
import { PostUpdateDeleter } from './PostUpdateDeleter'

export class PostUpdateHistory extends BaseSystem<BlockCommandArgs> {
  private readonly addedQueries = new Map<new () => ISerializable, Query>()

  private readonly changedQueries = new Map<new () => ISerializable, Query>()

  private readonly removedQueries = new Map<new () => ISerializable, Query>()

  private readonly entities = this.query((q) => q.current.with(comps.Persistent).usingAll.write)

  private readonly frame = this.singleton.read(comps.Frame)

  private readonly history = new History()

  private readonly resources!: CoreResources

  public constructor() {
    super()

    this.schedule((s) => s.after(PostUpdateDeleter))

    const Components = ComponentRegistry.instance.historyComponents

    for (const Component of Components) {
      const addedQuery = this.query((q) => q.added.with(comps.Persistent, Component))
      this.addedQueries.set(Component, addedQuery)

      const changedQuery = this.query((q) => q.changed.with(comps.Persistent, Component).trackWrites)
      this.changedQueries.set(Component, changedQuery)

      const removedQuery = this.query((q) => q.removed.with(comps.Persistent, Component))
      this.removedQueries.set(Component, removedQuery)
    }
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.Undo, this.undo.bind(this))
    this.addCommandListener(BlockCommand.Redo, this.redo.bind(this))
    this.addCommandListener(BlockCommand.CreateCheckpoint, this.createCheckpoint.bind(this))
  }

  public execute(): void {
    for (const Component of this.addedQueries.keys()) {
      const query = this.addedQueries.get(Component)!
      if (query.added.length === 0) continue
      this.history.addComponents(Component, query.added)
    }

    for (const Component of this.changedQueries.keys()) {
      const query = this.changedQueries.get(Component)!
      if (query.changed.length === 0) continue
      this.history.updateComponents(Component, query.changed)
    }

    const hasRemoved = Array.from(this.removedQueries.values()).some((q) => q.removed.length > 0)
    if (hasRemoved) {
      this.accessRecentlyDeletedData(true)
    }
    for (const Component of this.removedQueries.keys()) {
      const query = this.removedQueries.get(Component)!
      if (query.removed.length === 0) continue
      this.history.removeComponents(Component, query.removed)
    }

    if (this.frame.value === 1) {
      this.history.reset()
    }

    this.executeCommands()
  }

  private undo(): void {
    const diff = this.history.undo()
    if (!diff) return

    this.applyDiff(diff)
    this.syncLocalDB(diff)
  }

  private redo(): void {
    const diff = this.history.redo()
    if (!diff) return

    this.applyDiff(diff)
    this.syncLocalDB(diff)
  }

  private applyDiff(diff: HistoryDiff): void {
    const componentNames = new Map(ComponentRegistry.instance.historyComponents.map((c) => [c.name, c]))

    const addedEntities = new Map<string, Entity>()

    // added entity ids
    for (const id of diff.addedEntityIds) {
      const entity = this.createEntity(comps.Persistent, { id })
      addedEntities.set(id, entity)
    }

    // added components
    for (const [id, components] of Object.entries(diff.addedComponents)) {
      let entity = addedEntities.get(id)
      if (!entity) {
        entity = this.entities.current.find((e) => e.alive && e.read(comps.Persistent).id === id)
        if (!entity) continue
      }

      for (const [componentName, model] of Object.entries(components)) {
        const Component = componentNames.get(componentName)
        if (!Component) continue
        entity.add(Component, model)
      }
    }

    // changed components
    for (const [id, components] of Object.entries(diff.changedComponents)) {
      const entity = this.entities.current.find((e) => e.alive && e.read(comps.Persistent).id === id)
      if (!entity) continue

      for (const [componentName, model] of Object.entries(components)) {
        const Component = componentNames.get(componentName)
        if (!Component) continue
        const writableComponent = entity.write(Component)
        writableComponent.fromModel(model)
      }
    }

    // removed entities
    for (const id of diff.removedEntityIds) {
      const entity = this.entities.current.find((e) => e.alive && e.read(comps.Persistent).id === id)
      if (!entity) continue

      entity.delete()
    }

    // removed components
    for (const [id, components] of Object.entries(diff.removedComponents)) {
      const entity = this.entities.current.find((e) => e.alive && e.read(comps.Persistent).id === id)
      if (!entity) continue

      for (const componentName of Object.keys(components)) {
        const Component = componentNames.get(componentName)
        if (!Component) continue
        entity.remove(Component)
      }
    }
  }

  private syncLocalDB(diff: HistoryDiff): void {
    // // added entities
    // for (const [id, components] of Object.entries(diff.addedEntities)) {
    //   for (const [componentName, model] of Object.entries(components)) {
    //     const key = `${id}/${componentName}`
    //     this.resources.localDB.add(key, model)
    //   }
    // }

    // added components
    for (const [id, components] of Object.entries(diff.addedComponents)) {
      for (const [componentName, model] of Object.entries(components)) {
        this.resources.localDB.add(id, componentName, model)
      }
    }

    // changed components
    for (const [id, components] of Object.entries(diff.changedComponents)) {
      for (const [componentName, model] of Object.entries(components)) {
        this.resources.localDB.put(id, componentName, model)
      }
    }

    // removed components
    for (const [id, components] of Object.entries(diff.removedComponents)) {
      for (const componentName of Object.keys(components)) {
        this.resources.localDB.delete(id, componentName)
      }
    }

    // // removed entities
    // for (const id of diff.removedEntities) {
    //   this.resources.localDB.delete(id)
    // }
  }

  private createCheckpoint(): void {
    const diff = this.history.createCheckpoint()

    if (!diff) return
    this.syncLocalDB(diff)
  }
}

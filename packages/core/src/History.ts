import type { Entity } from '@lastolivegames/becsy'
import { Persistent } from './components'
import type { ISerializable } from './types'

type Id = string
type ComponentName = string
type ComponentField = string
type ComponentValue = number | string | boolean | Array<number>
export type State = Record<Id, Record<ComponentName, Record<ComponentField, ComponentValue>>>

export class Diff {
  public added: State = {}
  public changedFrom: State = {}
  public changedTo: State = {}
  public removed: State = {}

  get isEmpty(): boolean {
    return (
      Object.keys(this.added).length === 0 &&
      Object.keys(this.changedFrom).length === 0 &&
      Object.keys(this.changedTo).length === 0 &&
      Object.keys(this.removed).length === 0
    )
  }

  public addComponent(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): void {
    if (!this.added[id]) {
      this.added[id] = {}
    }
    this.added[id][compName] = model
  }

  public changeComponent(
    id: Id,
    compName: ComponentName,
    fromModel: Record<ComponentField, ComponentValue>,
    toModel: Record<ComponentField, ComponentValue>,
  ): void {
    if (this.added[id]?.[compName]) {
      // diff was added in the same commit, so we can just update it
      this.added[id][compName] = toModel
      return
    }

    if (!this.changedFrom[id]) {
      this.changedFrom[id] = {}
    }
    if (!this.changedFrom[id][compName]) {
      this.changedFrom[id][compName] = fromModel
    }

    if (!this.changedTo[id]) {
      this.changedTo[id] = {}
    }
    this.changedTo[id][compName] = toModel
  }

  public removeComponent(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): void {
    if (this.added[id]?.[compName]) {
      delete this.added[id][compName]
      if (Object.keys(this.added[id]).length === 0) {
        delete this.added[id]
      }
      return
    }

    if (this.changedFrom[id]?.[compName]) {
      delete this.changedFrom[id][compName]
      if (Object.keys(this.changedFrom[id]).length === 0) {
        delete this.changedFrom[id]
      }
    }

    if (this.changedTo[id]?.[compName]) {
      delete this.changedTo[id][compName]
      if (Object.keys(this.changedTo[id]).length === 0) {
        delete this.changedTo[id]
      }
    }

    if (!this.removed[id]) {
      this.removed[id] = {}
    }
    this.removed[id][compName] = model
  }

  public clone(): Diff {
    const clone = new Diff()
    clone.added = JSON.parse(JSON.stringify(this.added))
    clone.changedFrom = JSON.parse(JSON.stringify(this.changedFrom))
    clone.changedTo = JSON.parse(JSON.stringify(this.changedTo))
    clone.removed = JSON.parse(JSON.stringify(this.removed))
    return clone
  }

  public reverse(): Diff {
    const reversed = new Diff()
    reversed.added = this.removed
    reversed.changedFrom = this.changedTo
    reversed.changedTo = this.changedFrom
    reversed.removed = this.added
    return reversed
  }

  public clear(): void {
    this.added = {}
    this.changedFrom = {}
    this.changedTo = {}
    this.removed = {}
  }

  public merge(other: Diff): void {
    for (const [id, components] of Object.entries(other.added)) {
      for (const [compName, model] of Object.entries(components)) {
        this.addComponent(id, compName, model)
      }
    }

    for (const [id, components] of Object.entries(other.changedFrom)) {
      for (const [compName, fromModel] of Object.entries(components)) {
        const toModel = other.changedTo[id]?.[compName]
        if (toModel) {
          this.changeComponent(id, compName, fromModel, toModel)
        }
      }
    }

    for (const [id, components] of Object.entries(other.removed)) {
      for (const [compName, model] of Object.entries(components)) {
        this.removeComponent(id, compName, model)
      }
    }
  }
}

export class StateManager {
  public state: State = {}

  public putComponent(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): void {
    if (!this.state[id]) {
      this.state[id] = {}
    }
    this.state[id][compName] = model
  }

  public removeComponent(id: Id, compName: ComponentName): void {
    if (!this.state[id]) return
    delete this.state[id][compName]
    if (Object.keys(this.state[id]).length === 0) {
      delete this.state[id]
    }
  }

  public recordIsTheSame(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): boolean {
    const record = this.state[id]?.[compName]
    if (!record) return false

    for (const [field, value] of Object.entries(model)) {
      if (Array.isArray(value)) {
        if (
          !Array.isArray(record[field]) ||
          record[field].length !== value.length ||
          !record[field].every((v, i) => v === value[i])
        ) {
          return false
        }
      } else if (record[field] !== value) {
        return false
      }
    }

    return true
  }

  public getRecord(id: Id, compName: ComponentName): Record<ComponentField, ComponentValue> | undefined {
    return this.state[id]?.[compName]
  }

  public applyDiff(diff: Diff): void {
    for (const [id, components] of Object.entries(diff.added)) {
      for (const [compName, model] of Object.entries(components)) {
        this.putComponent(id, compName, model)
      }
    }

    for (const [id, components] of Object.entries(diff.changedTo)) {
      for (const [compName, toModel] of Object.entries(components)) {
        this.putComponent(id, compName, toModel)
      }
    }

    for (const [id, components] of Object.entries(diff.removed)) {
      for (const [compName, _model] of Object.entries(components)) {
        this.removeComponent(id, compName)
      }
    }
  }

  public computeDiff(fromState: State): Diff {
    const diff = new Diff()

    // added components
    for (const [id, components] of Object.entries(this.state)) {
      if (!fromState[id]) {
        diff.added[id] = components
        continue
      }

      for (const [compName, model] of Object.entries(components)) {
        if (!fromState[id][compName]) {
          diff.addComponent(id, compName, model)
        } else if (!this.recordIsTheSame(id, compName, fromState[id][compName])) {
          diff.changeComponent(id, compName, fromState[id][compName], model)
        }
      }
    }

    // removed components
    for (const [id, components] of Object.entries(fromState)) {
      if (!this.state[id]) {
        diff.removed[id] = components
        continue
      }

      for (const compName of Object.keys(components)) {
        if (!this.state[id][compName]) {
          diff.removeComponent(id, compName, components[compName])
        }
      }
    }

    return diff
  }
}

export class History {
  private stateManager = new StateManager()

  private diffSinceCheckpoint = new Diff()
  public frameDiff = new Diff()

  private readonly undoStack: Diff[] = []
  private readonly redoStack: Diff[] = []

  public get isClean(): boolean {
    return this.diffSinceCheckpoint.isEmpty
  }

  public addComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)
      const model = comp.toModel()

      if (this.stateManager.recordIsTheSame(id, Component.name, model)) continue

      this.frameDiff.addComponent(id, Component.name, model)
      this.diffSinceCheckpoint.addComponent(id, Component.name, model)
      this.stateManager.putComponent(id, Component.name, model)
    }
  }

  public updateComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)
      const model = comp.toModel()

      if (this.stateManager.recordIsTheSame(id, Component.name, model)) continue

      const fromModel = this.stateManager.getRecord(id, Component.name) || {}
      this.frameDiff.changeComponent(id, Component.name, fromModel, model)
      this.diffSinceCheckpoint.changeComponent(id, Component.name, fromModel, model)
      this.stateManager.putComponent(id, Component.name, model)
    }
  }

  public removeComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const entityIds = new Set(entities.map((entity) => entity.read(Persistent).id))
    for (const id of entityIds) {
      const model = this.stateManager.getRecord(id, Component.name)
      if (!model) continue

      this.frameDiff.removeComponent(id, Component.name, model)
      this.diffSinceCheckpoint.removeComponent(id, Component.name, model)
      this.stateManager.removeComponent(id, Component.name)
    }
  }

  public createCheckpoint(): Diff | null {
    if (this.diffSinceCheckpoint.isEmpty) return null

    const diff = this.diffSinceCheckpoint
    this.undoStack.push(diff)
    this.diffSinceCheckpoint = new Diff()
    this.redoStack.length = 0

    return diff
  }

  public undo(): Diff | null {
    if (!this.diffSinceCheckpoint.isEmpty) return null
    if (this.undoStack.length === 0) return null

    const diff = this.undoStack.pop()!
    this.redoStack.push(diff)

    const reversedDiff = diff.clone().reverse()
    this.stateManager.applyDiff(reversedDiff)
    this.frameDiff.merge(reversedDiff)

    return reversedDiff
  }

  public redo(): Diff | null {
    // check that the current state is clean
    if (!this.diffSinceCheckpoint.isEmpty) {
      // we can't redo because the current state has changes
      this.redoStack.length = 0
      return null
    }
    if (this.redoStack.length === 0) return null

    const diff = this.redoStack.pop()!
    this.undoStack.push(diff)

    this.stateManager.applyDiff(diff)
    this.frameDiff.merge(diff)

    return diff
  }

  public applyDiff(diff: Diff): void {
    this.stateManager.applyDiff(diff)
  }

  public reset(): void {
    this.frameDiff.clear()
    this.diffSinceCheckpoint.clear()

    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  public getState(): State {
    return JSON.parse(JSON.stringify(this.stateManager.state))
  }

  public getEntities(ids: Id[]): State {
    const state: State = {}
    for (const id of ids) {
      const record = this.stateManager.state[id]
      if (record) {
        state[id] = record
      }
    }
    return JSON.parse(JSON.stringify(state))
  }

  public computeDiff(fromState: State): Diff {
    return this.stateManager.computeDiff(fromState)
  }
}

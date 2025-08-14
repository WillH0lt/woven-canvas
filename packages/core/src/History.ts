import type { Entity } from '@lastolivegames/becsy'
import type { BaseComponent } from './BaseComponent'
import { Block } from './components'

type Id = string
type ComponentName = string
type ComponentField = string
type ComponentValue = number | string | boolean | Array<number>
export type Snapshot = Record<Id, Record<ComponentName, Record<ComponentField, ComponentValue>>>

export class Diff {
  public added: Snapshot = {}
  public changedFrom: Snapshot = {}
  public changedTo: Snapshot = {}
  public removed: Snapshot = {}

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

export class SnapshotBuilder {
  public snapshot: Snapshot = {}

  public putComponent(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): void {
    if (!this.snapshot[id]) {
      this.snapshot[id] = {}
    }
    this.snapshot[id][compName] = model
  }

  public removeComponent(id: Id, compName: ComponentName): void {
    if (!this.snapshot[id]) return
    delete this.snapshot[id][compName]
    if (Object.keys(this.snapshot[id]).length === 0) {
      delete this.snapshot[id]
    }
  }

  public recordIsTheSame(id: Id, compName: ComponentName, model: Record<ComponentField, ComponentValue>): boolean {
    const record = this.snapshot[id]?.[compName]
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
    return this.snapshot[id]?.[compName]
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

  public computeDiff(fromSnapshot: Snapshot): Diff {
    const diff = new Diff()

    // added components
    for (const [id, components] of Object.entries(this.snapshot)) {
      if (!fromSnapshot[id]) {
        diff.added[id] = components
        continue
      }

      for (const [compName, model] of Object.entries(components)) {
        if (!fromSnapshot[id][compName]) {
          diff.addComponent(id, compName, model)
        } else if (!this.recordIsTheSame(id, compName, fromSnapshot[id][compName])) {
          diff.changeComponent(id, compName, fromSnapshot[id][compName], model)
        }
      }
    }

    // removed components
    for (const [id, components] of Object.entries(fromSnapshot)) {
      if (!this.snapshot[id]) {
        diff.removed[id] = components
        continue
      }

      for (const compName of Object.keys(components)) {
        if (!this.snapshot[id][compName]) {
          diff.removeComponent(id, compName, components[compName])
        }
      }
    }

    return diff
  }
}

export class History {
  private snapshotBuilder = new SnapshotBuilder()

  private diffSinceCheckpoint = new Diff()
  public frameDiff = new Diff()

  private readonly undoStack: Diff[] = []
  private readonly redoStack: Diff[] = []

  public clipboard: Snapshot | null = null

  public get isClean(): boolean {
    return this.diffSinceCheckpoint.isEmpty
  }

  public addComponents(Comp: new () => BaseComponent, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Block).id
      const comp = entity.read(Comp)
      const model = comp.toJson()

      if (this.snapshotBuilder.recordIsTheSame(id, Comp.name, model)) continue

      this.frameDiff.addComponent(id, Comp.name, model)
      this.diffSinceCheckpoint.addComponent(id, Comp.name, model)
      this.snapshotBuilder.putComponent(id, Comp.name, model)
    }
  }

  public updateComponents(Comp: new () => BaseComponent, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Block).id
      const comp = entity.read(Comp)
      const model = comp.toJson()

      if (this.snapshotBuilder.recordIsTheSame(id, Comp.name, model)) continue

      const fromModel = this.snapshotBuilder.getRecord(id, Comp.name) || {}
      this.frameDiff.changeComponent(id, Comp.name, fromModel, model)
      this.diffSinceCheckpoint.changeComponent(id, Comp.name, fromModel, model)
      this.snapshotBuilder.putComponent(id, Comp.name, model)
    }
  }

  public removeComponents(Comp: new () => BaseComponent, entities: readonly Entity[]): void {
    const entityIds = new Set(entities.map((entity) => entity.read(Block).id))
    for (const id of entityIds) {
      const model = this.snapshotBuilder.getRecord(id, Comp.name)
      if (!model) continue

      this.frameDiff.removeComponent(id, Comp.name, model)
      this.diffSinceCheckpoint.removeComponent(id, Comp.name, model)
      this.snapshotBuilder.removeComponent(id, Comp.name)
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
    this.snapshotBuilder.applyDiff(reversedDiff)
    this.frameDiff.merge(reversedDiff)

    return reversedDiff
  }

  public redo(): Diff | null {
    // check that the current snapshot is clean
    if (!this.diffSinceCheckpoint.isEmpty) {
      // we can't redo because the current snapshot has changes
      this.redoStack.length = 0
      return null
    }
    if (this.redoStack.length === 0) return null

    const diff = this.redoStack.pop()!
    this.undoStack.push(diff)

    this.snapshotBuilder.applyDiff(diff)
    this.frameDiff.merge(diff)

    return diff
  }

  public applyDiff(diff: Diff): void {
    this.snapshotBuilder.applyDiff(diff)
  }

  public reset(): void {
    this.frameDiff.clear()
    this.diffSinceCheckpoint.clear()

    this.undoStack.length = 0
    this.redoStack.length = 0
  }

  public getSnapshot(): Snapshot {
    return JSON.parse(JSON.stringify(this.snapshotBuilder.snapshot))
  }

  public getEntities(ids: Id[]): Snapshot {
    const snapshot: Snapshot = {}
    for (const id of ids) {
      const record = this.snapshotBuilder.snapshot[id]
      if (record) {
        snapshot[id] = record
      }
    }
    return JSON.parse(JSON.stringify(snapshot))
  }

  public computeDiff(fromSnapshot: Snapshot): Diff {
    return this.snapshotBuilder.computeDiff(fromSnapshot)
  }
}

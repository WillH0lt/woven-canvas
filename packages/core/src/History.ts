import type { Entity } from '@lastolivegames/becsy'
import { Persistent } from './components'
import type { ISerializable } from './types'

type Id = string
type ComponentName = string
type ComponentField = string
type ComponentValue = number | string | boolean | Array<number>
type HistoryState = Record<Id, Record<ComponentName, Record<ComponentField, ComponentValue>>>

export type HistoryDiff = {
  addedEntityIds: Set<Id>
  addedComponents: HistoryState
  changedComponents: HistoryState
  removedComponents: HistoryState
  removedEntityIds: Set<Id>
}

function cloneHistoryState(state: HistoryState): HistoryState {
  return JSON.parse(JSON.stringify(state)) as HistoryState
}

function createDiff(fromState: HistoryState, toState: HistoryState): HistoryDiff {
  const diff: HistoryDiff = {
    addedEntityIds: new Set(),
    removedEntityIds: new Set(),
    addedComponents: {},
    changedComponents: {},
    removedComponents: {},
  }

  // Find added/changed entities and components
  for (const id in toState) {
    if (!fromState[id]) {
      diff.addedEntityIds.add(id)
    }

    for (const compName in toState[id]) {
      if (!fromState[id] || !fromState[id][compName]) {
        if (!diff.addedComponents[id]) {
          diff.addedComponents[id] = {}
        }
        diff.addedComponents[id][compName] = toState[id][compName]
      } else if (JSON.stringify(fromState[id][compName]) !== JSON.stringify(toState[id][compName])) {
        if (!diff.changedComponents[id]) {
          diff.changedComponents[id] = {}
        }
        diff.changedComponents[id][compName] = toState[id][compName]
      }
    }
  }

  // Find removed entities and components
  for (const id in fromState) {
    if (!toState[id]) {
      diff.removedEntityIds.add(id)
    }

    for (const compName in fromState[id]) {
      if (!toState[id] || !toState[id][compName]) {
        if (!diff.removedComponents[id]) {
          diff.removedComponents[id] = {}
        }
        diff.removedComponents[id][compName] = fromState[id][compName]
      }
    }
  }

  return diff
}

function diffIsEmpty(diff: HistoryDiff): boolean {
  return (
    diff.addedEntityIds.size === 0 &&
    diff.removedEntityIds.size === 0 &&
    Object.keys(diff.addedComponents).length === 0 &&
    Object.keys(diff.changedComponents).length === 0 &&
    Object.keys(diff.removedComponents).length === 0
  )
}

export class History {
  private currentState: HistoryState = {}

  private lastCheckpoint: HistoryState = {}
  private readonly undoStack: HistoryState[] = []
  private readonly redoStack: HistoryState[] = []

  public addComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)

      if (!this.currentState[id]) {
        this.currentState[id] = {}
      }

      this.currentState[id][Component.name] = comp.toModel()
    }
  }

  public updateComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    for (const entity of entities) {
      const id = entity.read(Persistent).id
      const comp = entity.read(Component)

      if (!this.currentState[id]) {
        console.warn(`Component with id ${id} does not exist in state for component ${Component.name}.`)
        continue
      }

      this.currentState[id][Component.name] = comp.toModel()
    }
  }

  public removeComponents(Component: new () => ISerializable, entities: readonly Entity[]): void {
    const entityIds = new Set(entities.map((entity) => entity.read(Persistent).id))
    for (const id of entityIds) {
      if (this.currentState[id]) {
        delete this.currentState[id][Component.name]
        if (Object.keys(this.currentState[id]).length === 0) {
          delete this.currentState[id]
        }
      }
    }
  }

  public undo(): HistoryDiff | null {
    if (this.undoStack.length === 0) return null

    // check that the current state is clean
    const currentDiff = createDiff(this.currentState, this.lastCheckpoint)
    if (!diffIsEmpty(currentDiff)) {
      // we have a diff in the current state, don't push to the undo stack
      // because there is no checkpoint
      console.log('returning current diff')
      return currentDiff
    }

    const previousState = this.undoStack.pop()!
    const diff = createDiff(this.lastCheckpoint, previousState)
    this.redoStack.push(cloneHistoryState(this.lastCheckpoint))
    this.lastCheckpoint = cloneHistoryState(previousState)

    return diff
  }

  public redo(): HistoryDiff | null {
    if (this.redoStack.length === 0) return null

    // check that the current state is clean
    const currentDiff = createDiff(this.currentState, this.lastCheckpoint)
    if (!diffIsEmpty(currentDiff)) {
      // we can't redo because the current state has changes
      this.redoStack.length = 0
      return null
    }

    const nextState = this.redoStack.pop()!
    const diff = createDiff(this.lastCheckpoint, nextState)
    this.undoStack.push(cloneHistoryState(this.lastCheckpoint))
    this.lastCheckpoint = cloneHistoryState(nextState)

    return diff
  }

  public createCheckpoint(): HistoryDiff | null {
    const diff = createDiff(this.lastCheckpoint, this.currentState)

    console.log('Creating checkpoint', diffIsEmpty(diff), diff)
    if (diffIsEmpty(diff)) return null

    this.undoStack.push(cloneHistoryState(this.lastCheckpoint))
    this.lastCheckpoint = cloneHistoryState(this.currentState)
    this.redoStack.length = 0

    return diff
  }

  public reset(): void {
    this.lastCheckpoint = cloneHistoryState(this.currentState)
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}

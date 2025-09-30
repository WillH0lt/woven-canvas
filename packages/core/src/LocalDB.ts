import { type IDBPDatabase, openDB } from 'idb'
import type { Diff, Snapshot } from './History'
import { SESSION_KEY } from './constants'

const PREFIX = 'InfiniteCanvas-'
const OBJECT_STORE_NAME = 'blocks'

enum ActionKind {
  PUT = 0,
  DELETE = 1,
}

interface Action {
  kind: ActionKind
  key: string
  value: Record<string, any>
}

const COMMIT_INTERVAL = 1000

export class LocalDB {
  private commitPromise: Promise<void> | null = null

  private actions: Action[] = []

  public static async New(persistenceKey: string): Promise<LocalDB> {
    const name = PREFIX + persistenceKey
    const db = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore(OBJECT_STORE_NAME)
      },
    })

    return new LocalDB(db)
  }

  private constructor(private db: IDBPDatabase) {
    setInterval(() => {
      this.commit().catch((err) => console.error('Error committing to LocalDB:', err))
    }, COMMIT_INTERVAL)
  }

  public applyDiff(diff: Diff): void {
    // added components
    for (const [id, components] of Object.entries(diff.added)) {
      for (const [componentName, model] of Object.entries(components)) {
        this.put(id, componentName, model)
      }
    }

    // changed components
    for (const [id, components] of Object.entries(diff.changedTo)) {
      for (const [componentName, model] of Object.entries(components)) {
        this.put(id, componentName, model)
      }
    }

    // removed components
    for (const [id, components] of Object.entries(diff.removed)) {
      for (const componentName of Object.keys(components)) {
        this.delete(id, componentName)
      }
    }
  }

  public put(id: string, componentName: string, value: Record<string, any>): void {
    const action = { kind: ActionKind.PUT, key: `${id}/${componentName}`, value }
    this.addAction(action)
  }

  public putSession(componentName: string, value: Record<string, any>): void {
    this.put(SESSION_KEY, componentName, value)
  }

  public delete(id: string, componentName: string): void {
    const action = { kind: ActionKind.DELETE, key: `${id}/${componentName}`, value: {} }
    this.addAction(action)
  }

  private addAction(action: Action): void {
    // merge actions with the same key
    let value = action.value
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const a = this.actions[i]
      if (a.key === action.key && a.kind === action.kind) {
        this.actions.splice(i, 1)
        value = { ...a.value, ...value }
      }
    }

    action.value = value
    this.actions.push(action)
  }

  public async getAll(): Promise<Snapshot> {
    if (this.commitPromise) {
      await this.commitPromise
    }

    const tx = this.db.transaction(OBJECT_STORE_NAME, 'readonly')
    const store = tx.objectStore(OBJECT_STORE_NAME)

    const [records, keys] = await Promise.all([store.getAll(), store.getAllKeys()])

    const allEntries: Snapshot = {}
    for (let i = 0; i < keys.length; i++) {
      const [id, componentName] = String(keys[i]).split('/')
      if (!id || !componentName) {
        console.warn(`Invalid key format: ${keys[i]}`)
        continue
      }

      if (!allEntries[id]) {
        allEntries[id] = {}
      }

      allEntries[id][componentName] = records[i]
    }

    return allEntries
  }

  private async commit(): Promise<void> {
    if (this.commitPromise) {
      console.warn('Commit already in progress, skipping this commit.')
      return this.commitPromise
    }

    this.commitPromise = (async () => {
      const actionsClone = JSON.parse(JSON.stringify(this.actions))
      this.actions = []
      await runActions(actionsClone, this.db)
      this.commitPromise = null
    })()

    return this.commitPromise
  }
}

async function runActions(actions: Action[], db: IDBPDatabase): Promise<void> {
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite')
  const store = tx.objectStore(OBJECT_STORE_NAME)

  for (const action of actions) {
    switch (action.kind) {
      case ActionKind.PUT:
        try {
          await store.put(action.value, action.key)
        } catch (error) {
          console.error('Error putting to LocalDB:', error)
        }
        break
      case ActionKind.DELETE:
        try {
          await store.delete(action.key)
        } catch (error) {
          console.error('Error deleting from LocalDB:', error)
        }
        break
    }
  }

  await tx.done
}

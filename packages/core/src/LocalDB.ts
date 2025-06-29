import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'

const PREFIX = 'InfiniteCanvas-'
const OBJECT_STORE_NAME = 'blocks'

enum ActionKind {
  ADD = 0,
  PUT = 1,
  DELETE = 2,
}

interface Action {
  kind: ActionKind
  key: string
  value: any
}

const COMMIT_INTERVAL = 1000

export class LocalDB {
  private commitPromise: Promise<void> | null = null

  private actions: Action[] = []

  public static async New(persistenceKey: string): Promise<LocalDB> {
    const name = PREFIX + persistenceKey
    const db = await openDB(name, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          db.createObjectStore(OBJECT_STORE_NAME)
        }
      },
    })

    return new LocalDB(db)
  }

  private constructor(private db: IDBPDatabase) {
    setInterval(() => {
      this.commit().catch((err) => console.error('Error committing to LocalDB:', err))
    }, COMMIT_INTERVAL)
  }

  public add(id: string, componentName: string, value: any): void {
    console.log('Adding to LocalDB:', id, componentName, value)
    this.actions.push({ kind: ActionKind.ADD, key: `${id}/${componentName}`, value })
  }

  public put(id: string, componentName: string, value: any): void {
    this.actions.push({ kind: ActionKind.PUT, key: `${id}/${componentName}`, value })
  }

  public delete(id: string, componentName: string): void {
    this.actions.push({ kind: ActionKind.DELETE, key: `${id}/${componentName}`, value: undefined })
  }

  public async getAll(): Promise<Record<string, any>> {
    if (this.commitPromise) {
      await this.commitPromise
    }

    const tx = this.db.transaction(OBJECT_STORE_NAME, 'readonly')
    const store = tx.objectStore(OBJECT_STORE_NAME)

    const [records, keys] = await Promise.all([store.getAll(), store.getAllKeys()])

    const allEntries: Record<string, any> = {}
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
  if (actions.length > 0) {
    console.log('Running actions:', actions)
  }

  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite')
  const store = tx.objectStore(OBJECT_STORE_NAME)

  for (const action of actions) {
    switch (action.kind) {
      case ActionKind.ADD:
        await store.add(action.value, action.key)
        break
      case ActionKind.PUT:
        await store.put(action.value, action.key)
        break
      case ActionKind.DELETE:
        await store.delete(action.key)
        break
    }
  }

  await tx.done
}

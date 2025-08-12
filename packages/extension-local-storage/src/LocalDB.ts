import { type IDBPDatabase, openDB } from 'idb'

const PREFIX = 'InfiniteCanvas-'
const OBJECT_STORE_NAME = 'blocks'

enum ActionKind {
  PUT = 0,
  DELETE = 1,
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

  public put(id: string, componentName: string, value: any): void {
    this.actions.push({ kind: ActionKind.PUT, key: `${id}/${componentName}`, value })
  }

  public delete(id: string, componentName: string): void {
    this.actions.push({ kind: ActionKind.DELETE, key: `${id}/${componentName}`, value: undefined })
  }

  public async getAll(): Promise<Record<string, Record<string, any>>> {
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

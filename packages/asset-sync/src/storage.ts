import { type IDBPDatabase, openDB } from 'idb'

/**
 * Open (or create) a named IndexedDB database with a single object store
 * and return a lightweight key-value wrapper around it.
 */
export async function openStore(dbName: string, storeName: string): Promise<KeyValueStore> {
  const db = await openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName)
      }
    },
  })
  return new KeyValueStore(db, storeName)
}

/**
 * Thin key-value wrapper around a single IDBObjectStore.
 * All writes are immediate (no buffering).
 */
export class KeyValueStore {
  constructor(
    private db: IDBPDatabase,
    private storeName: string,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.db.get(this.storeName, key)
  }

  async put(key: string, value: unknown): Promise<void> {
    await this.db.put(this.storeName, value, key)
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(this.storeName, key)
  }

  async getAllEntries(): Promise<[string, unknown][]> {
    const tx = this.db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    const keys = await store.getAllKeys()
    const values = await store.getAll()
    const result: [string, unknown][] = []

    for (let i = 0; i < keys.length; i++) {
      result.push([keys[i] as string, values[i]])
    }

    return result
  }

  async clear(): Promise<void> {
    const tx = this.db.transaction(this.storeName, 'readwrite')
    tx.objectStore(this.storeName).clear()
    await tx.done
  }

  close(): void {
    this.db.close()
  }
}

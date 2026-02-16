import type { AssetMetadata, AssetProvider } from './AssetProvider'
import { type KeyValueStore, openStore } from './storage'

const DB_NAME = 'infinitecanvas-assets'
const STORE_NAME = 'blobs'

interface StoredAsset {
  blob: Blob
  metadata?: AssetMetadata
}

/**
 * Local asset provider that stores files in IndexedDB.
 * Used as the default provider when no custom provider is specified.
 *
 * This is suitable for local-only apps or demos. For production apps
 * with cloud storage, implement your own AssetProvider.
 */
export class LocalAssetProvider implements AssetProvider {
  private store: KeyValueStore | null = null
  private initPromise: Promise<KeyValueStore> | null = null

  async upload(blob: Blob, identifier: string, metadata?: AssetMetadata) {
    const store = await this.getStore()

    await store.put(identifier, { blob, metadata } satisfies StoredAsset)

    return {}
  }

  async resolveUrl(identifier: string) {
    const store = await this.getStore()
    const record = await store.get<StoredAsset>(identifier)

    if (!record) {
      throw new Error(`Asset not found: ${identifier}`)
    }

    return URL.createObjectURL(record.blob)
  }

  async delete(identifier: string) {
    const store = await this.getStore()
    await store.delete(identifier)
  }

  close() {
    if (this.store) {
      this.store.close()
      this.store = null
      this.initPromise = null
    }
  }

  // Options with sensible defaults
  urlCacheTtl = 3600
  cacheDownloads = false
  maxCacheSize = 100 * 1024 * 1024 // 100MB
  maxRetries = 3
  retryDelay = 5000

  private getStore(): Promise<KeyValueStore> {
    if (this.store) return Promise.resolve(this.store)

    if (!this.initPromise) {
      this.initPromise = openStore(DB_NAME, STORE_NAME).then((store) => {
        this.store = store
        return store
      })
    }

    return this.initPromise
  }
}

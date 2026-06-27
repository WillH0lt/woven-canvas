import type { AssetMetadata, AssetProvider, ResolveDimensions } from './AssetProvider'
import { type KeyValueStore, openStore } from './storage'

/**
 * Upload job stored in IndexedDB.
 */
interface UploadJob {
  identifier: string
  metadata?: AssetMetadata
  createdAt: number
  retryCount: number
}

/**
 * Options for AssetManager.
 */
export interface AssetManagerOptions {
  /** User-provided asset storage adapter */
  provider: AssetProvider
  /** Document ID for namespacing IndexedDB storage */
  documentId: string
}

/**
 * Manages asset uploads and URL resolution.
 *
 * Handles:
 * - Queueing uploads with persistence across sessions
 * - Creating blob URLs for immediate display of pending uploads
 * - Automatic retry of failed uploads
 */
export class AssetManager {
  private jobsStore: KeyValueStore | null = null
  private binariesStore: KeyValueStore | null = null
  private provider: AssetProvider
  private documentId: string
  private maxRetries: number
  private retryDelay: number

  /** Active blob URLs mapped by identifier */
  private blobUrls = new Map<string, string>()
  /** Currently uploading identifiers */
  private uploading = new Set<string>()
  /** Pending upload promises */
  private uploadPromises = new Map<
    string,
    {
      resolve: () => void
      reject: (error: Error) => void
    }
  >()
  /** Lifecycle listeners — fire for every upload, including resumed ones. */
  private startListeners = new Set<(identifier: string) => void>()
  private completeListeners = new Set<(identifier: string) => void>()
  private errorListeners = new Set<(identifier: string, error: Error) => void>()
  /** Identifiers whose blob+job are currently mid-write to IndexedDB. */
  private persisting = new Set<string>()
  private persistStartListeners = new Set<(identifier: string) => void>()
  private persistEndListeners = new Set<(identifier: string) => void>()

  constructor(options: AssetManagerOptions) {
    this.provider = options.provider
    this.documentId = options.documentId
    this.maxRetries = options.provider.maxRetries ?? 3
    this.retryDelay = options.provider.retryDelay ?? 5000
  }

  /**
   * Subscribe to upload lifecycle events. Returns an unsubscribe function.
   *
   * These fire for every provider.upload() attempt — first-time uploads, retries,
   * and uploads resumed from IndexedDB on a later session. This makes them the
   * single source of truth for upload-state transitions; consumers that wire
   * into these events don't need to also await upload() to stay consistent.
   */
  onUploadStart(listener: (identifier: string) => void): () => void {
    this.startListeners.add(listener)
    return () => {
      this.startListeners.delete(listener)
    }
  }

  onUploadComplete(listener: (identifier: string) => void): () => void {
    this.completeListeners.add(listener)
    return () => {
      this.completeListeners.delete(listener)
    }
  }

  onUploadError(listener: (identifier: string, error: Error) => void): () => void {
    this.errorListeners.add(listener)
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  /**
   * Subscribe to persistence lifecycle. Fires while a freshly accepted blob is
   * mid-write to IndexedDB — the destructive window where leaving the tab loses
   * the binary. Once persist-end fires, the upload to the remote provider is
   * fully resumable across reloads (see resumePendingUploads()), so consumers
   * gating tab/route exits should release the lock at persist-end.
   */
  onPersistStart(listener: (identifier: string) => void): () => void {
    this.persistStartListeners.add(listener)
    return () => {
      this.persistStartListeners.delete(listener)
    }
  }

  onPersistEnd(listener: (identifier: string) => void): () => void {
    this.persistEndListeners.add(listener)
    return () => {
      this.persistEndListeners.delete(listener)
    }
  }

  /**
   * Initialize the AssetManager.
   * Opens IndexedDB stores and prepares for operations.
   */
  async init(): Promise<void> {
    const dbPrefix = `wovencanvas-assets-${this.documentId}`

    // Open all stores in parallel
    const [jobsStore, binariesStore] = await Promise.all([
      openStore(`${dbPrefix}-jobs`, 'jobs'),
      openStore(`${dbPrefix}-binaries`, 'binaries'),
    ])

    this.jobsStore = jobsStore
    this.binariesStore = binariesStore
  }

  /**
   * Upload an asset.
   *
   * Stores the binary in IndexedDB and creates a blob URL for immediate display.
   * The upload will be attempted immediately if online, or resumed later.
   * Returns a promise that resolves when the upload completes.
   *
   * @param identifier - The unique identifier for this asset (e.g., UUID)
   * @param blob - The binary data to upload
   * @param metadata - Optional metadata about the asset
   */
  async upload(identifier: string, blob: Blob, metadata?: AssetMetadata): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) {
      throw new Error('AssetManager not initialized')
    }

    // Register the blob URL synchronously, before any awaits, so callers of
    // getDisplayUrl() in the same tick see the local preview instead of
    // falling through to provider.resolveUrl() (which for remote providers
    // would hand back a URL that doesn't exist yet).
    const blobUrl = URL.createObjectURL(blob)
    this.blobUrls.set(identifier, blobUrl)

    // Track the IDB-write window separately from the upload window. Until both
    // writes below resolve, leaving the tab loses the binary; after that point,
    // pending uploads are fully recoverable via resumePendingUploads().
    this.persisting.add(identifier)
    for (const listener of this.persistStartListeners) listener(identifier)
    try {
      await this.binariesStore.put(identifier, blob)
      const job: UploadJob = {
        identifier,
        metadata,
        createdAt: Date.now(),
        retryCount: 0,
      }
      await this.jobsStore.put(identifier, job)
    } finally {
      this.persisting.delete(identifier)
      for (const listener of this.persistEndListeners) listener(identifier)
    }

    // Return a promise that resolves when upload completes
    return new Promise<void>((resolve, reject) => {
      this.uploadPromises.set(identifier, { resolve, reject })
      this.startUpload(identifier)
    })
  }

  /**
   * Get the display URL for an asset.
   *
   * For pending uploads, returns the blob URL (the local preview is already at
   * full resolution, so `dimensions` is ignored on this path).
   * For completed uploads, resolves the URL from the provider, passing the
   * render size through so resizing providers can return a matching variant.
   *
   * @param identifier - The asset identifier
   * @param dimensions - The size the asset is about to be rendered at. See {@link ResolveDimensions}.
   * @returns The URL to display, or null if not available
   */
  async getDisplayUrl(identifier: string, dimensions: ResolveDimensions): Promise<string | null> {
    if (!identifier) return null

    // If we have a blob URL for this identifier, use it (pending upload)
    const blobUrl = this.blobUrls.get(identifier)
    if (blobUrl) {
      return blobUrl
    }

    // Resolve through the provider (handles HTTP URLs, local paths, UUIDs, etc.)
    try {
      const resolved = await this.provider.resolveUrl(identifier, dimensions)
      return resolved
    } catch (error) {
      console.error(`Failed to resolve URL for ${identifier}:`, error)
      return null
    }
  }

  /**
   * (Re)attempt every persisted upload that isn't already in flight.
   *
   * Call this after initialization AND whenever connectivity is regained — it is
   * the single entry point for "drain whatever is still pending now". It is
   * idempotent and safe to call repeatedly:
   * - uploads already in flight are skipped (no duplicate attempts),
   * - the local preview is only re-created when we don't already hold it (so a
   *   same-session reconnect keeps its live blob URL instead of leaking a new one),
   * - each job's retry budget is reset, so an upload that exhausted its retries
   *   during a long offline spell tries again instead of staying failed until reload.
   *
   * Note: resumed uploads have no promise to resolve since the original upload()
   * caller (if any) is from a previous session or has already settled.
   */
  async resumePendingUploads(): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) {
      throw new Error('AssetManager not initialized')
    }

    const entries = await this.jobsStore.getAllEntries()

    for (const [identifier, value] of entries) {
      // Already uploading — leave it alone (don't reset its retries or restart it).
      if (this.uploading.has(identifier)) continue

      // Restore the local preview only if we don't already hold it: first resume
      // after a reload needs it; a same-session reconnect already has a live URL.
      if (!this.blobUrls.has(identifier)) {
        const blob = await this.binariesStore.get<Blob>(identifier)
        if (blob) {
          this.blobUrls.set(identifier, URL.createObjectURL(blob))
        }
      }

      // Give the job a fresh retry budget so a previously-exhausted upload retries.
      const job = value as UploadJob
      if (job?.retryCount) {
        await this.jobsStore.put(identifier, { ...job, retryCount: 0 })
      }

      this.startUpload(identifier)
    }
  }

  /**
   * Check if an asset has a pending upload.
   */
  hasPendingUpload(identifier: string): boolean {
    return this.blobUrls.has(identifier)
  }

  /**
   * Check if an asset is currently uploading.
   */
  isUploading(identifier: string): boolean {
    return this.uploading.has(identifier)
  }

  /**
   * Check if an asset is currently mid-write to IndexedDB. See onPersistStart
   * for the distinction between persistence and upload.
   */
  isPersisting(identifier: string): boolean {
    return this.persisting.has(identifier)
  }

  /**
   * Number of assets currently mid-write to IndexedDB.
   */
  get persistingCount(): number {
    return this.persisting.size
  }

  /**
   * Cancel a pending upload and clean up resources.
   */
  async cancelUpload(identifier: string): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return

    // Revoke blob URL
    const blobUrl = this.blobUrls.get(identifier)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      this.blobUrls.delete(identifier)
    }

    // Remove from IndexedDB
    await this.jobsStore.delete(identifier)
    await this.binariesStore.delete(identifier)

    this.uploading.delete(identifier)

    // Reject any pending promise
    const pending = this.uploadPromises.get(identifier)
    if (pending) {
      pending.reject(new Error('Upload cancelled'))
      this.uploadPromises.delete(identifier)
    }
  }

  /**
   * Clean up resources.
   */
  close(): void {
    // Revoke all blob URLs
    for (const url of this.blobUrls.values()) {
      URL.revokeObjectURL(url)
    }
    this.blobUrls.clear()

    this.jobsStore?.close()
    this.binariesStore?.close()

    this.jobsStore = null
    this.binariesStore = null
  }

  // --- Internal ---

  private async startUpload(identifier: string): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return
    if (this.uploading.has(identifier)) return

    this.uploading.add(identifier)

    const job = await this.jobsStore.get<UploadJob>(identifier)
    const blob = await this.binariesStore.get<Blob>(identifier)

    if (!job || !blob) {
      this.uploading.delete(identifier)
      return
    }

    for (const listener of this.startListeners) listener(identifier)

    try {
      await this.provider.upload(blob, identifier, job.metadata)

      // Upload succeeded
      await this.handleUploadSuccess(identifier)
    } catch (error) {
      await this.handleUploadError(identifier, job, error)
    }
  }

  private async handleUploadSuccess(identifier: string): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return

    // Clean up blob URL
    const blobUrl = this.blobUrls.get(identifier)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      this.blobUrls.delete(identifier)
    }

    // Remove job and binary from IndexedDB
    await this.jobsStore.delete(identifier)
    await this.binariesStore.delete(identifier)

    this.uploading.delete(identifier)

    for (const listener of this.completeListeners) listener(identifier)

    // Resolve the promise
    const pending = this.uploadPromises.get(identifier)
    if (pending) {
      pending.resolve()
      this.uploadPromises.delete(identifier)
    }
  }

  private async handleUploadError(identifier: string, job: UploadJob, error: unknown): Promise<void> {
    if (!this.jobsStore) return

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Upload failed for ${identifier}:`, errorMessage)

    this.uploading.delete(identifier)

    if (job.retryCount < this.maxRetries) {
      // Update retry count and schedule retry
      const updatedJob: UploadJob = {
        ...job,
        retryCount: job.retryCount + 1,
      }
      await this.jobsStore.put(identifier, updatedJob)

      setTimeout(
        () => {
          this.startUpload(identifier)
        },
        this.retryDelay * 2 ** job.retryCount,
      ) // Exponential backoff
    } else {
      // Max retries exceeded
      const finalError = error instanceof Error ? error : new Error(errorMessage)
      for (const listener of this.errorListeners) listener(identifier, finalError)

      const pending = this.uploadPromises.get(identifier)
      if (pending) {
        pending.reject(finalError)
        this.uploadPromises.delete(identifier)
      }
    }
  }
}

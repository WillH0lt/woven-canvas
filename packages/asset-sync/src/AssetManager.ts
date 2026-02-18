import type { AssetMetadata, AssetProvider } from './AssetProvider'
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

  constructor(options: AssetManagerOptions) {
    this.provider = options.provider
    this.documentId = options.documentId
    this.maxRetries = options.provider.maxRetries ?? 3
    this.retryDelay = options.provider.retryDelay ?? 5000
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

    // Store the binary
    await this.binariesStore.put(identifier, blob)

    // Store the job
    const job: UploadJob = {
      identifier,
      metadata,
      createdAt: Date.now(),
      retryCount: 0,
    }
    await this.jobsStore.put(identifier, job)

    // Create blob URL for immediate display
    const blobUrl = URL.createObjectURL(blob)
    this.blobUrls.set(identifier, blobUrl)

    // Return a promise that resolves when upload completes
    return new Promise<void>((resolve, reject) => {
      this.uploadPromises.set(identifier, { resolve, reject })
      this.startUpload(identifier)
    })
  }

  /**
   * Get the display URL for an asset.
   *
   * For pending uploads, returns the blob URL.
   * For completed uploads, resolves and caches the URL from the provider.
   *
   * @param identifier - The asset identifier
   * @returns The URL to display, or null if not available
   */
  async getDisplayUrl(identifier: string): Promise<string | null> {
    // If we have a blob URL for this identifier, use it (pending upload)
    const blobUrl = this.blobUrls.get(identifier)
    if (blobUrl) {
      return blobUrl
    }

    // Resolve from provider
    try {
      return await this.provider.resolveUrl(identifier)
    } catch (error) {
      console.error(`Failed to resolve URL for ${identifier}:`, error)
      return null
    }
  }

  /**
   * Resume any pending uploads from previous sessions.
   * Call this after initialization.
   * Note: Resumed uploads won't have promises to resolve since they're from a previous session.
   */
  async resumePendingUploads(): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) {
      throw new Error('AssetManager not initialized')
    }

    const entries = await this.jobsStore.getAllEntries()

    for (const [identifier] of entries) {
      // Restore blob URL from stored binary
      const blob = await this.binariesStore.get<Blob>(identifier)
      if (blob) {
        const blobUrl = URL.createObjectURL(blob)
        this.blobUrls.set(identifier, blobUrl)
      }
      // Start upload (no promise to resolve for resumed uploads)
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

    try {
      await this.provider.upload(blob, identifier, job.metadata)

      // Upload succeeded
      await this.onUploadSuccess(identifier)
    } catch (error) {
      await this.onUploadError(identifier, job, error)
    }
  }

  private async onUploadSuccess(identifier: string): Promise<void> {
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

    // Resolve the promise
    const pending = this.uploadPromises.get(identifier)
    if (pending) {
      pending.resolve()
      this.uploadPromises.delete(identifier)
    }
  }

  private async onUploadError(identifier: string, job: UploadJob, error: unknown): Promise<void> {
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
      // Max retries exceeded, reject the promise
      const pending = this.uploadPromises.get(identifier)
      if (pending) {
        pending.reject(new Error(errorMessage))
        this.uploadPromises.delete(identifier)
      }
    }
  }
}

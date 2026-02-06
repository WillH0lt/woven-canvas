import type { AssetProvider, AssetMetadata } from "./AssetProvider";
import { openStore, type KeyValueStore } from "./storage";

/**
 * Upload job stored in IndexedDB.
 */
interface UploadJob {
  identifier: string;
  metadata?: AssetMetadata;
  createdAt: number;
  retryCount: number;
}

/**
 * Cached asset entry.
 */
interface CacheEntry {
  blob: Blob;
  cachedAt: number;
  size: number;
}

/**
 * URL cache entry (in memory).
 */
interface UrlCacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Options for AssetManager.
 */
export interface AssetManagerOptions {
  /** User-provided asset storage adapter */
  provider: AssetProvider;
  /** Document ID for namespacing IndexedDB storage */
  documentId: string;
}


/**
 * Manages asset uploads, caching, and URL resolution.
 *
 * Handles:
 * - Queueing uploads with persistence across sessions
 * - Creating blob URLs for immediate display of pending uploads
 * - Caching resolved URLs with TTL
 * - Optional local caching of downloaded assets
 * - Automatic retry of failed uploads
 */
export class AssetManager {
  private jobsStore: KeyValueStore | null = null;
  private binariesStore: KeyValueStore | null = null;
  private cacheStore: KeyValueStore | null = null;
  private provider: AssetProvider;
  private documentId: string;
  private urlCacheTtl: number;
  private cacheDownloads: boolean;
  private maxCacheSize: number;
  private maxRetries: number;
  private retryDelay: number;

  /** In-memory URL cache */
  private urlCache = new Map<string, UrlCacheEntry>();
  /** Active blob URLs mapped by identifier */
  private blobUrls = new Map<string, string>();
  /** Currently uploading identifiers */
  private uploading = new Set<string>();
  /** Pending upload promises */
  private uploadPromises = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
    }
  >();

  constructor(options: AssetManagerOptions) {
    this.provider = options.provider;
    this.documentId = options.documentId;
    this.urlCacheTtl = options.provider.urlCacheTtl ?? 3600;
    this.cacheDownloads = options.provider.cacheDownloads ?? false;
    this.maxCacheSize = options.provider.maxCacheSize ?? 100 * 1024 * 1024; // 100MB
    this.maxRetries = options.provider.maxRetries ?? 3;
    this.retryDelay = options.provider.retryDelay ?? 5000;
  }

  /**
   * Initialize the AssetManager.
   * Opens IndexedDB stores and prepares for operations.
   */
  async init(): Promise<void> {
    const dbPrefix = `infinitecanvas-assets-${this.documentId}`;

    // Open all stores in parallel
    const [jobsStore, binariesStore, cacheStore] = await Promise.all([
      openStore(`${dbPrefix}-jobs`, "jobs"),
      openStore(`${dbPrefix}-binaries`, "binaries"),
      openStore(`${dbPrefix}-cache`, "cache"),
    ]);

    this.jobsStore = jobsStore;
    this.binariesStore = binariesStore;
    this.cacheStore = cacheStore;
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
  async upload(
    identifier: string,
    blob: Blob,
    metadata?: AssetMetadata,
  ): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) {
      throw new Error("AssetManager not initialized");
    }

    // Store the binary
    await this.binariesStore.put(identifier, blob);

    // Store the job
    const job: UploadJob = {
      identifier,
      metadata,
      createdAt: Date.now(),
      retryCount: 0,
    };
    await this.jobsStore.put(identifier, job);

    // Create blob URL for immediate display
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrls.set(identifier, blobUrl);

    // Return a promise that resolves when upload completes
    return new Promise<void>((resolve, reject) => {
      this.uploadPromises.set(identifier, { resolve, reject });
      this.startUpload(identifier);
    });
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
    const blobUrl = this.blobUrls.get(identifier);
    if (blobUrl) {
      return blobUrl;
    }

    // Check URL cache
    const cached = this.urlCache.get(identifier);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    // Check if we have a cached blob locally
    if (this.cacheDownloads && this.cacheStore) {
      const cachedEntry = await this.cacheStore.get<CacheEntry>(identifier);
      if (cachedEntry) {
        const url = URL.createObjectURL(cachedEntry.blob);
        // Note: This creates a new blob URL each time, which is fine for
        // occasional use but could be optimized with a blob URL cache
        return url;
      }
    }

    // Resolve from provider
    try {
      const url = await this.provider.resolveUrl(identifier);

      // Cache the URL
      this.urlCache.set(identifier, {
        url,
        expiresAt: Date.now() + this.urlCacheTtl * 1000,
      });

      return url;
    } catch (error) {
      console.error(`Failed to resolve URL for ${identifier}:`, error);
      return null;
    }
  }

  /**
   * Resume any pending uploads from previous sessions.
   * Call this after initialization.
   * Note: Resumed uploads won't have promises to resolve since they're from a previous session.
   */
  async resumePendingUploads(): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) {
      throw new Error("AssetManager not initialized");
    }

    const entries = await this.jobsStore.getAllEntries();

    for (const [identifier] of entries) {
      // Restore blob URL from stored binary
      const blob = await this.binariesStore.get<Blob>(identifier);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.set(identifier, blobUrl);
      }
      // Start upload (no promise to resolve for resumed uploads)
      this.startUpload(identifier);
    }
  }

  /**
   * Check if an asset has a pending upload.
   */
  hasPendingUpload(identifier: string): boolean {
    return this.blobUrls.has(identifier);
  }

  /**
   * Check if an asset is currently uploading.
   */
  isUploading(identifier: string): boolean {
    return this.uploading.has(identifier);
  }

  /**
   * Cancel a pending upload and clean up resources.
   */
  async cancelUpload(identifier: string): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return;

    // Revoke blob URL
    const blobUrl = this.blobUrls.get(identifier);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrls.delete(identifier);
    }

    // Remove from IndexedDB
    await this.jobsStore.delete(identifier);
    await this.binariesStore.delete(identifier);

    this.uploading.delete(identifier);

    // Reject any pending promise
    const pending = this.uploadPromises.get(identifier);
    if (pending) {
      pending.reject(new Error("Upload cancelled"));
      this.uploadPromises.delete(identifier);
    }
  }

  /**
   * Cache a downloaded asset locally.
   * Only works if cacheDownloads is enabled.
   */
  async cacheAsset(identifier: string, blob: Blob): Promise<void> {
    if (!this.cacheDownloads || !this.cacheStore) return;

    // Simple LRU eviction - could be more sophisticated
    await this.evictCacheIfNeeded(blob.size);

    const entry: CacheEntry = {
      blob,
      cachedAt: Date.now(),
      size: blob.size,
    };
    await this.cacheStore.put(identifier, entry);
  }

  /**
   * Clean up resources.
   */
  close(): void {
    // Revoke all blob URLs
    for (const url of this.blobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();
    this.urlCache.clear();

    this.jobsStore?.close();
    this.binariesStore?.close();
    this.cacheStore?.close();

    this.jobsStore = null;
    this.binariesStore = null;
    this.cacheStore = null;
  }

  // --- Internal ---

  private async startUpload(identifier: string): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return;
    if (this.uploading.has(identifier)) return;

    this.uploading.add(identifier);

    const job = await this.jobsStore.get<UploadJob>(identifier);
    const blob = await this.binariesStore.get<Blob>(identifier);

    if (!job || !blob) {
      this.uploading.delete(identifier);
      return;
    }

    try {
      const result = await this.provider.upload(blob, identifier, job.metadata);

      // Upload succeeded
      await this.onUploadSuccess(identifier, result.url);
    } catch (error) {
      await this.onUploadError(identifier, job, error);
    }
  }

  private async onUploadSuccess(
    identifier: string,
    url?: string,
  ): Promise<void> {
    if (!this.jobsStore || !this.binariesStore) return;

    // Clean up blob URL
    const blobUrl = this.blobUrls.get(identifier);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      this.blobUrls.delete(identifier);
    }

    // Remove job and binary from IndexedDB
    await this.jobsStore.delete(identifier);
    await this.binariesStore.delete(identifier);

    // Cache the URL if provided
    if (url) {
      this.urlCache.set(identifier, {
        url,
        expiresAt: Date.now() + this.urlCacheTtl * 1000,
      });
    }

    this.uploading.delete(identifier);

    // Resolve the promise
    const pending = this.uploadPromises.get(identifier);
    if (pending) {
      pending.resolve();
      this.uploadPromises.delete(identifier);
    }
  }

  private async onUploadError(
    identifier: string,
    job: UploadJob,
    error: unknown,
  ): Promise<void> {
    if (!this.jobsStore) return;

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Upload failed for ${identifier}:`, errorMessage);

    this.uploading.delete(identifier);

    if (job.retryCount < this.maxRetries) {
      // Update retry count and schedule retry
      const updatedJob: UploadJob = {
        ...job,
        retryCount: job.retryCount + 1,
      };
      await this.jobsStore.put(identifier, updatedJob);

      setTimeout(() => {
        this.startUpload(identifier);
      }, this.retryDelay * Math.pow(2, job.retryCount)); // Exponential backoff
    } else {
      // Max retries exceeded, reject the promise
      const pending = this.uploadPromises.get(identifier);
      if (pending) {
        pending.reject(new Error(errorMessage));
        this.uploadPromises.delete(identifier);
      }
    }
  }

  private async evictCacheIfNeeded(neededSize: number): Promise<void> {
    if (!this.cacheStore) return;

    const entries = await this.cacheStore.getAllEntries();
    const cacheEntries: Array<{ key: string; entry: CacheEntry }> = [];
    let totalSize = 0;

    for (const [key, value] of entries) {
      const entry = value as CacheEntry;
      cacheEntries.push({ key, entry });
      totalSize += entry.size;
    }

    // If we have room, no eviction needed
    if (totalSize + neededSize <= this.maxCacheSize) {
      return;
    }

    // Sort by cachedAt (oldest first)
    cacheEntries.sort((a, b) => a.entry.cachedAt - b.entry.cachedAt);

    // Evict until we have room
    let evicted = 0;
    for (const { key, entry } of cacheEntries) {
      if (totalSize - evicted + neededSize <= this.maxCacheSize) {
        break;
      }
      await this.cacheStore.delete(key);
      evicted += entry.size;
    }
  }
}

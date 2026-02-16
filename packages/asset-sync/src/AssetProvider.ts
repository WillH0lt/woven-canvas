/**
 * Metadata about an asset being uploaded.
 */
export interface AssetMetadata {
  /** Original filename */
  filename?: string
  /** MIME type (e.g., "image/png") */
  mimeType?: string
  /** Image width in pixels (for images) */
  width?: number
  /** Image height in pixels (for images) */
  height?: number
}

/**
 * Result of a successful upload.
 */
export interface AssetUploadResult {
  /** Optional immediate URL if the provider can supply one */
  url?: string
}

/**
 * User-provided interface for asset storage with optional configuration.
 *
 * Implement this interface to integrate with your own image/asset hosting service.
 * Configuration options can be provided alongside the methods.
 *
 * @example
 * ```typescript
 * const myProvider: AssetProvider = {
 *   // Storage methods
 *   async upload(blob, metadata) {
 *     const formData = new FormData();
 *     formData.append('file', blob, metadata?.filename);
 *     const response = await fetch('/api/upload', { method: 'POST', body: formData });
 *     const { id, url } = await response.json();
 *     return { identifier: id, url };
 *   },
 *   async resolveUrl(identifier) {
 *     const response = await fetch(`/api/assets/${identifier}/url`);
 *     const { url } = await response.json();
 *     return url;
 *   },
 *   // Options
 *   urlCacheTtl: 3600,
 *   cacheDownloads: true,
 * };
 * ```
 */
export interface AssetProvider {
  /**
   * Upload a blob to storage.
   *
   * @param blob - The binary data to upload
   * @param identifier - The unique identifier to use for this asset
   * @param metadata - Optional metadata about the asset
   * @returns Optionally an immediate URL
   */
  upload(blob: Blob, identifier: string, metadata?: AssetMetadata): Promise<AssetUploadResult>

  /**
   * Resolve an identifier to a displayable URL.
   *
   * This is called whenever an asset needs to be displayed. The URL may be
   * a signed URL with limited validity, so implementations should generate
   * fresh URLs each time or use appropriate caching.
   *
   * @param identifier - The permanent identifier from upload()
   * @returns A URL that can be used to display the asset
   */
  resolveUrl(identifier: string): Promise<string>

  /**
   * Optional: Delete an asset from storage.
   *
   * @param identifier - The permanent identifier to delete
   */
  delete?(identifier: string): Promise<void>

  // --- Options ---

  /** How long to cache resolved URLs in seconds (default: 3600) */
  urlCacheTtl?: number

  /** Whether to cache downloaded assets in IndexedDB (default: false) */
  cacheDownloads?: boolean

  /** Maximum cache size in bytes for downloaded assets (default: 100MB) */
  maxCacheSize?: number

  /** Maximum retry attempts for failed uploads (default: 3) */
  maxRetries?: number

  /** Delay between retry attempts in ms (default: 5000) */
  retryDelay?: number
}

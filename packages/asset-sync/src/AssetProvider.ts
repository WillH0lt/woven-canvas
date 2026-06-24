/**
 * Metadata about an asset being uploaded.
 */
export interface AssetMetadata {
  /** Original filename */
  filename?: string
  /** MIME type (e.g., "image/png") */
  mimeType?: string
}

/**
 * Result of a successful upload.
 */
export interface AssetUploadResult {
  /** Optional immediate URL if the provider can supply one */
  url?: string
}

/**
 * The size an asset is about to be rendered at, passed to
 * {@link AssetProvider.resolveUrl} so a provider backed by a resizing CDN
 * (Cloudinary, imgix, a thumbnailing service) can hand back an appropriately
 * sized image instead of the full original. Providers that don't resize can
 * ignore it and return the same URL regardless.
 *
 * Sizes are in *device* pixels — the block's CSS size multiplied by
 * `devicePixelRatio`, rounded up to a step and clamped to the asset's intrinsic
 * dimensions — so a provider can use them directly without re-applying dpr. They
 * only ever grow over a block's lifetime: shrinking a block keeps the larger
 * image (the browser scales it down for free), so a provider never needs to
 * worry about quality regressing.
 *
 * A block that constrains only one axis still supplies both — the unconstrained
 * axis is the asset's intrinsic size. A horizontally-repeating tape, for
 * instance, passes its source image's full width so the tile stays full-res,
 * and the displayed height for the other axis.
 */
export interface ResolveDimensions {
  /** Target render width in device pixels. */
  width: number
  /** Target render height in device pixels. */
  height: number
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
 *   async resolveUrl(identifier, { width, height }) {
 *     const response = await fetch(`/api/assets/${identifier}/url`);
 *     const { url } = await response.json();
 *     // For a resizing CDN: return `${url}?w=${width}&h=${height}`;
 *     return url;
 *   },
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
   * @param dimensions - The size the asset is about to be rendered at, so
   *   resizing providers can request a matching variant. See {@link ResolveDimensions}.
   * @returns A URL that can be used to display the asset
   */
  resolveUrl(identifier: string, dimensions: ResolveDimensions): Promise<string>

  /**
   * Optional: Delete an asset from storage.
   *
   * @param identifier - The permanent identifier to delete
   */
  delete?(identifier: string): Promise<void>

  // --- Options ---

  /** Maximum retry attempts for failed uploads (default: 3) */
  maxRetries?: number

  /** Delay between retry attempts in ms (default: 5000) */
  retryDelay?: number
}

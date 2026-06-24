/**
 * Quantize a CSS length into a device-pixel render target for asset resolution.
 *
 * The block's CSS size is multiplied by `devicePixelRatio` (for retina
 * crispness), rounded *up* to {@link ASSET_BUCKET_STEP} so a resize drag doesn't
 * fire a request per pixel, and optionally clamped to the asset's intrinsic size
 * so we never ask a CDN to upscale past the original. Callers compare the result
 * against the last requested bucket and only re-resolve when it grows — see
 * `ImageBlock.vue`.
 *
 * Falls back to `dpr = 1` when `window` is unavailable (SSR).
 */
export const ASSET_BUCKET_STEP = 256

export function bucketPx(cssLength: number, intrinsic = 0): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  let px = Math.ceil((cssLength * dpr) / ASSET_BUCKET_STEP) * ASSET_BUCKET_STEP
  if (intrinsic > 0) px = Math.min(px, intrinsic)
  return px
}

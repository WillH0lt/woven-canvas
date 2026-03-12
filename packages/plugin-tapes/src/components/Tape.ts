import { defineCanvasComponent, field } from '@woven-canvas/core'

/**
 * Tape component - stores tape-specific metadata for washi tape blocks.
 *
 * Tape is a ribbon-like element positioned by its two endpoints.
 * The block's width represents the tape length and height represents thickness.
 * Rotation is derived from the angle between endpoints.
 *
 * The tape image is stored via the Image and Asset components (same as image blocks).
 * For default tapes, the Asset identifier is set to the known URL directly —
 * AssetManager will return it as-is without going through the upload pipeline.
 * The image tiles horizontally along the tape length.
 */
export const Tape = defineCanvasComponent(
  { name: 'tape', sync: 'document' },
  {
    /** Tape thickness in world units (the height of the tape ribbon) */
    thickness: field.float64().default(30),
  },
)

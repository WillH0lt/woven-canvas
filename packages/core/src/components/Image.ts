import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

/**
 * Image component - stores image-specific metadata.
 *
 * Used alongside the Asset component for image blocks.
 * The actual image binary is managed by AssetManager, not stored in ECS.
 */
export const Image = defineCanvasComponent(
  { name: 'image', sync: 'document' },
  {
    /** Image width in pixels */
    width: field.uint16().default(0),
    /** Image height in pixels */
    height: field.uint16().default(0),
    /** Alt text for accessibility */
    alt: field.string().max(256).default(''),
  },
)

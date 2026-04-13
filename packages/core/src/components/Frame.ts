import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

/**
 * Frame component - stores frame-specific metadata.
 *
 * A Frame is a container rectangle with a white fill, black border,
 * and an editable label. Blocks can be placed inside frames by dragging
 * them over, and frames act as groups — moving/deleting a frame
 * moves/deletes its contents.
 */
export const Frame = defineCanvasComponent(
  { name: 'frame', sync: 'document' },
  {
    /** Editable label text displayed above the frame */
    label: field.string().max(128).default('Frame'),
  },
)

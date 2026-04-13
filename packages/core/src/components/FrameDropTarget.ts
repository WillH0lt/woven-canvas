import { defineCanvasComponent } from '@woven-ecs/canvas-store'

/**
 * FrameDropTarget component - local marker for frame highlight during drag.
 *
 * Added to a frame entity when a block is being dragged over it,
 * removed when the drag ends or the block moves away.
 * Used by the Vue renderer to show a visual highlight.
 */
export const FrameDropTarget = defineCanvasComponent({ name: 'frameDropTarget' }, {})

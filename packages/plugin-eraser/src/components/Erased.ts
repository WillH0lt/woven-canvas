import { defineCanvasComponent, field } from '@infinitecanvas/core'

/**
 * Erased component - marks an entity as being erased by an active eraser stroke.
 *
 * This is a temporary marker added to entities that the eraser stroke
 * intersects with. When the stroke is completed, all entities with this
 * component are deleted. When the stroke is cancelled, this component
 * is removed and the entity is restored to normal.
 *
 * @example
 * ```typescript
 * // In the eraser update system:
 * for (const entityId of intersectingEntities) {
 *   Erased.addTo(ctx, entityId, { eraserStrokeId: strokeEntityId });
 * }
 * ```
 */
export const Erased = defineCanvasComponent(
  { name: 'erased' },
  {
    /**
     * Reference to the eraser stroke entity that is targeting this block.
     * Used to track which stroke caused this entity to be marked for erasure.
     */
    eraserStrokeId: field.ref(),
  },
)

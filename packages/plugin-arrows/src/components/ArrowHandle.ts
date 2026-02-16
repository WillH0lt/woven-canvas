import { defineCanvasComponent, field } from '@infinitecanvas/core'
import { ArrowHandleKind } from '../types'

/**
 * ArrowHandle component - marks an entity as an arrow transform handle.
 *
 * Arrow handles are visual elements that allow users to drag and
 * modify arrow endpoints and control points.
 */
export const ArrowHandle = defineCanvasComponent(
  { name: 'arrowHandle' },
  {
    /** Kind of handle (start, middle, or end) */
    kind: field.enum(ArrowHandleKind).default(ArrowHandleKind.Start),

    /** Reference to the arrow entity this handle controls */
    arrowEntity: field.ref(),
  },
)

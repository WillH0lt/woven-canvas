import { defineCanvasComponent } from '@infinitecanvas/core'

/**
 * TransformBox component - marks an entity as the transform box.
 *
 * The transform box is a wrapper around the current selection that
 * provides resize handles and rotation handles. It has an associated
 * Block component for its position/size.
 *
 * Transform handles reference their parent transform box via the
 * TransformHandle component's transformBox field.
 */
export const TransformBox = defineCanvasComponent({ name: 'transformBox' }, {})

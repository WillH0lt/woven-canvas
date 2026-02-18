import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'

/**
 * Stroke style for shapes.
 */
export const StrokeKind = {
  Solid: 'solid',
  Dashed: 'dashed',
  None: 'none',
} as const

export type StrokeKind = (typeof StrokeKind)[keyof typeof StrokeKind]

/**
 * Shape component - defines the visual properties of a shape block.
 *
 * Includes shape type, stroke style/color/width, and fill color.
 */
export const Shape = defineCanvasComponent(
  { name: 'shape', sync: 'document' },
  {
    /** The kind of shape to render (e.g. 'rectangle', 'ellipse', or custom shape key) */
    kind: field.string().default('rectangle'),

    /** Stroke style */
    strokeKind: field.enum(StrokeKind).default(StrokeKind.Solid),

    /** Stroke width in pixels */
    strokeWidth: field.uint16().default(2),

    /** Stroke color - red component (0-255) */
    strokeRed: field.uint8().default(0),

    /** Stroke color - green component (0-255) */
    strokeGreen: field.uint8().default(0),

    /** Stroke color - blue component (0-255) */
    strokeBlue: field.uint8().default(0),

    /** Stroke color - alpha component (0-255) */
    strokeAlpha: field.uint8().default(255),

    /** Fill color - red component (0-255) */
    fillRed: field.uint8().default(255),

    /** Fill color - green component (0-255) */
    fillGreen: field.uint8().default(255),

    /** Fill color - blue component (0-255) */
    fillBlue: field.uint8().default(255),

    /** Fill color - alpha component (0-255) */
    fillAlpha: field.uint8().default(0),
  },
)

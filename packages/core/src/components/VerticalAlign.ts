import { defineCanvasComponent } from '@woven-ecs/canvas-store'
import { field } from '@woven-ecs/core'
import { VerticalAlignment } from '../types'

/**
 * VerticalAlign component - controls vertical text alignment within a block.
 *
 * Values: "top", "center", "bottom"
 */
export const VerticalAlign = defineCanvasComponent(
  { name: 'verticalAlign', sync: 'document' },
  {
    value: field.enum(VerticalAlignment).default(VerticalAlignment.Top),
  },
)

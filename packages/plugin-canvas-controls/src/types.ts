import { z } from 'zod'

/**
 * Schema for the canvas controls plugin options.
 */
export const CanvasControlsOptionsSchema = z.object({
  /** Minimum zoom level (default: 0.05 = 5%) */
  minZoom: z.number().default(0.05),
  /** Maximum zoom level (default: 2.7 = 270%) */
  maxZoom: z.number().default(2.7),
})

/**
 * Options for the canvas controls plugin (with defaults applied).
 */
export type CanvasControlsOptions = z.output<typeof CanvasControlsOptionsSchema>

/**
 * Input options for the canvas controls plugin (all fields optional).
 */
export type CanvasControlsOptionsInput = z.input<typeof CanvasControlsOptionsSchema>

/**
 * Default control options.
 */
export const DEFAULT_CONTROLS_OPTIONS: CanvasControlsOptions = CanvasControlsOptionsSchema.parse({})

/**
 * Pan state machine states.
 */
export enum PanStateValue {
  Idle = 'idle',
  Panning = 'panning',
  Gliding = 'gliding',
}

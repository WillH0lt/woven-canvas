import { z } from 'zod'

/**
 * Schema for the canvas controls plugin options.
 */
/**
 * Schema for camera bounds - restricts the camera to a rectangular region in world coordinates.
 */
export const CameraBoundsSchema = z.object({
  /** Top edge of the bounds in world coordinates */
  top: z.number(),
  /** Bottom edge of the bounds in world coordinates */
  bottom: z.number(),
  /** Left edge of the bounds in world coordinates */
  left: z.number(),
  /** Right edge of the bounds in world coordinates */
  right: z.number(),
  /** How to restrict the camera (default: 'edges')
   * - 'edges': the viewport edges cannot leave the bounds
   * - 'center': the viewport center cannot leave the bounds
   */
  restrict: z.enum(['edges', 'center']).default('edges'),
})

export type CameraBounds = z.infer<typeof CameraBoundsSchema>

export const CanvasControlsOptionsSchema = z.object({
  /** Minimum zoom level (default: 0.05 = 5%) */
  minZoom: z.number().default(0.05),
  /** Maximum zoom level (default: 2.7 = 270%) */
  maxZoom: z.number().default(2.7),
  /** Smooth scroll options - tweens between scroll points for a fluid feel */
  smoothScroll: z
    .object({
      /** Enable smooth scroll tweening (default: true) */
      enabled: z.boolean().default(true),
      /** Time in seconds to reach target position (default: 0.12) */
      time: z.number().default(0.12),
    })
    .default({}),
  /** Optional camera bounds - restricts the camera viewport to stay within this region */
  cameraBounds: CameraBoundsSchema.optional(),
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

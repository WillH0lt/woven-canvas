import type { BaseResources } from '@infinitecanvas/core'
import { z } from 'zod/v4'

export const ControlsOptions = z.object({
  minZoom: z.number().min(0).default(0.05),
  maxZoom: z.number().min(0).default(4),
})

export type ControlsOptionsInput = z.input<typeof ControlsOptions>
export type ControlsOptions = z.infer<typeof ControlsOptions>

export type ControlsResources = BaseResources & ControlsOptions

export enum WheelAction {
  None = 'none',
  Zoom = 'zoom',
  Scroll = 'scroll',
}

export enum PanState {
  Idle = 'idle',
  Panning = 'panning',
}

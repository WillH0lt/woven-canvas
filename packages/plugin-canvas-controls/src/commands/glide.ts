import { defineCommand } from '@woven-canvas/core'

/**
 * Smoothly glide the camera to center on the given world coordinates.
 */
export const GlideToPosition = defineCommand<{
  centerX: number
  centerY: number
}>('glide-to-position')

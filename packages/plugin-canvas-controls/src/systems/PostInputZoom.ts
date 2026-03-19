import {
  Camera,
  type Context,
  Controls,
  defineEditorSystem,
  getFrameInput,
  getMouseInput,
  getPluginResources,
  Keyboard,
  Mouse,
  Screen,
} from '@woven-canvas/core'

import { GlideState, ScrollState, ZoomState } from '../components'
import { CONTROLS_PLUGIN_NAME } from '../constants'
import { smoothDamp1D } from '../helpers'
import { clampCameraToBounds } from '../helpers/clampCameraToBounds'
import type { CanvasControlsOptions } from '../types'

/** Velocity threshold below which smooth zoom stops */
const VELOCITY_THRESHOLD = 0.001

/**
 * Apply a zoom level to the camera, keeping the world point under the
 * given screen anchor fixed.
 */
function applyZoom(ctx: Context, newZoom: number, anchorX: number, anchorY: number, options: CanvasControlsOptions) {
  const camera = Camera.read(ctx)
  const screen = Screen.read(ctx)

  const cameraWidth = screen.width / camera.zoom
  const cameraHeight = screen.height / camera.zoom
  const newCameraWidth = screen.width / newZoom
  const newCameraHeight = screen.height / newZoom

  const dx = newCameraWidth - cameraWidth
  const dy = newCameraHeight - cameraHeight

  const percentX = anchorX / screen.width
  const percentY = anchorY / screen.height

  const cam = Camera.write(ctx)
  cam.left = camera.left - percentX * dx
  cam.top = camera.top - percentY * dy
  cam.zoom = newZoom

  if (options.cameraBounds) {
    clampCameraToBounds(ctx, cam, options.cameraBounds)
  }
}

/**
 * Calculate the target zoom from a wheel delta, clamped to min/max bounds.
 */
function calcZoomFromWheel(wheelDeltaY: number, currentZoom: number, options: CanvasControlsOptions): number {
  const zoom = 2 ** ((-0.8 * wheelDeltaY) / 500) * currentZoom
  return Math.min(options.maxZoom, Math.max(options.minZoom, zoom))
}

/**
 * Post input zoom system - handles mouse scroll zoom with modifier key.
 *
 * When smoothZoom is disabled, zooms directly toward the mouse cursor position.
 * When smoothZoom is enabled, wheel deltas accumulate into a target zoom
 * and the camera smoothly damps toward it each frame.
 *
 * Maintains the world point under the cursor in both modes.
 * Respects minZoom and maxZoom bounds.
 *
 * Runs late in the input phase (priority: -100) to process input after
 * core input systems have updated singletons.
 *
 * Active when: Mouse wheel scrolled and "zoom" tool is active for wheel input.
 */
export const PostInputZoom = defineEditorSystem({ phase: 'input', priority: -100 }, (ctx: Context) => {
  // Defer to camera glide when active
  if (GlideState.read(ctx).active) {
    ZoomState.reset(ctx)
    return
  }

  const options = getPluginResources<CanvasControlsOptions>(ctx, CONTROLS_PLUGIN_NAME)
  const keyboard = Keyboard.read(ctx)

  // Only zoom when the zoom tool is active for wheel input
  const isZoomActive = Controls.wheelActive(ctx, 'zoom', keyboard.modDown)

  // Check for wheel event
  const mouseEvents = getMouseInput(ctx)
  const wheelEvent = mouseEvents.find((e) => e.type === 'wheel')

  if (!options.smoothZoom.enabled) {
    // Direct zoom mode
    if (!isZoomActive || !wheelEvent) return

    const camera = Camera.read(ctx)
    const mouse = Mouse.read(ctx)
    const zoom = calcZoomFromWheel(wheelEvent.wheelDeltaY, camera.zoom, options)
    applyZoom(ctx, zoom, mouse.position[0], mouse.position[1], options)
    return
  }

  // Smooth zoom mode
  const camera = Camera.read(ctx)
  const mouse = Mouse.read(ctx)
  const state = ZoomState.read(ctx)
  let { active, targetZoom, velocity, anchorX, anchorY } = state

  // If a zoom event arrives while smooth scroll is animating, snap scroll to
  // its target so the camera position settles before we start zooming.
  // Otherwise the scroll animation keeps shifting camera.left/top each frame,
  // pulling the zoom anchor off course.
  if (isZoomActive && wheelEvent && ScrollState.read(ctx).active) {
    ScrollState.reset(ctx)
  }

  // Accumulate wheel deltas into target zoom
  if (isZoomActive && wheelEvent) {
    const baseZoom = active ? targetZoom : camera.zoom
    targetZoom = calcZoomFromWheel(wheelEvent.wheelDeltaY, baseZoom, options)
    anchorX = mouse.position[0]
    anchorY = mouse.position[1]
    active = true
  }

  // Animate toward target
  if (!active) return

  const { delta } = getFrameInput(ctx)

  const { value: newZoom, velocity: newVelocity } = smoothDamp1D(
    camera.zoom,
    targetZoom,
    velocity,
    options.smoothZoom.time,
    Number.POSITIVE_INFINITY,
    delta,
  )

  // Stop when close enough and velocity is low
  const done = Math.abs(newZoom - targetZoom) < 0.0001 && Math.abs(newVelocity) < VELOCITY_THRESHOLD

  applyZoom(ctx, done ? targetZoom : newZoom, anchorX, anchorY, options)

  // Write zoom state
  const zs = ZoomState.write(ctx)
  zs.active = !done
  zs.targetZoom = targetZoom
  zs.velocity = done ? 0 : newVelocity
  zs.anchorX = anchorX
  zs.anchorY = anchorY
})

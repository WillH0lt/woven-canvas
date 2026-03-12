import {
  Camera,
  type Context,
  Controls,
  defineEditorSystem,
  defineQuery,
  getFrameInput,
  getMouseInput,
  getPluginResources,
  Keyboard,
  Pointer,
} from '@woven-canvas/core'

import { ScrollState } from '../components'
import { CONTROLS_PLUGIN_NAME } from '../constants'
import { smoothDamp } from '../helpers'
import type { CanvasControlsOptions } from '../types'

/** Velocity threshold below which smooth scroll stops */
const VELOCITY_THRESHOLD = 0.5

/** Query for any active pointer entities */
const pointerQuery = defineQuery((q) => q.with(Pointer))

/**
 * Check if any key was pressed this frame by scanning the keysDownTrigger buffer.
 */
function hasAnyKeyDown(keysDownTrigger: ArrayLike<number>): boolean {
  for (let i = 0; i < keysDownTrigger.length; i++) {
    if (keysDownTrigger[i] !== 0) return true
  }
  return false
}

/**
 * Post input scroll system - handles mouse scroll canvas panning.
 *
 * When smoothScroll is disabled (default), pans the canvas directly based on
 * wheel deltas.
 *
 * When smoothScroll is enabled, wheel deltas accumulate into a target position
 * and the camera smoothly damps toward it each frame.
 *
 * Runs late in the input phase (priority: -100) to process input after
 * core input systems have updated singletons.
 *
 * Active when: Mouse wheel scrolled and "scroll" tool is active.
 */
export const PostInputScroll = defineEditorSystem({ phase: 'input', priority: -100 }, (ctx: Context) => {
  const options = getPluginResources<CanvasControlsOptions>(ctx, CONTROLS_PLUGIN_NAME)
  const keyboard = Keyboard.read(ctx)

  // Only scroll when the scroll tool is active for wheel input
  const scrollActive = Controls.wheelActive(ctx, 'scroll', keyboard.modDown)

  if (!options.smoothScroll) {
    // Direct scroll mode (original behavior)
    if (!scrollActive) return

    const mouseEvents = getMouseInput(ctx)
    const wheelEvent = mouseEvents.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const camera = Camera.read(ctx)
    const cam = Camera.write(ctx)
    cam.left = camera.left + wheelEvent.wheelDeltaX / camera.zoom
    cam.top = camera.top + wheelEvent.wheelDeltaY / camera.zoom
    return
  }

  // Smooth scroll mode
  const camera = Camera.read(ctx)
  const state = ScrollState.read(ctx)
  let { active, targetLeft, targetTop, velocityX, velocityY } = state

  // Cancel smooth scroll immediately if any key or pointer is down.
  // This prevents conflicts when switching to zoom (Ctrl held) or
  // starting a drag while the scroll animation is still running.
  if (active && (hasAnyKeyDown(keyboard.keysDownTrigger) || pointerQuery.current(ctx).length > 0)) {
    const ss = ScrollState.write(ctx)
    ss.active = false
    ss.velocityX = 0
    ss.velocityY = 0
    return
  }

  // Accumulate wheel deltas into target
  if (scrollActive) {
    const mouseEvents = getMouseInput(ctx)
    const wheelEvent = mouseEvents.find((e) => e.type === 'wheel')
    if (wheelEvent) {
      const dx = wheelEvent.wheelDeltaX / camera.zoom
      const dy = wheelEvent.wheelDeltaY / camera.zoom
      if (!active) {
        // Start fresh from current camera position
        targetLeft = camera.left + dx
        targetTop = camera.top + dy
      } else {
        targetLeft += dx
        targetTop += dy
      }
      active = true
    }
  }

  // Animate toward target
  if (!active) return

  const { delta } = getFrameInput(ctx)

  const { position, velocity } = smoothDamp(
    [camera.left, camera.top],
    [targetLeft, targetTop],
    [velocityX, velocityY],
    options.smoothScrollTime,
    Number.POSITIVE_INFINITY,
    delta,
  )

  // Stop when close enough and velocity is low
  const distSq = (position[0] - targetLeft) ** 2 + (position[1] - targetTop) ** 2
  const done = distSq < 0.01 && Math.hypot(velocity[0], velocity[1]) < VELOCITY_THRESHOLD

  // Write camera
  const cam = Camera.write(ctx)
  cam.left = done ? targetLeft : position[0]
  cam.top = done ? targetTop : position[1]

  // Write scroll state
  const ss = ScrollState.write(ctx)
  ss.active = !done
  ss.targetLeft = targetLeft
  ss.targetTop = targetTop
  ss.velocityX = done ? 0 : velocity[0]
  ss.velocityY = done ? 0 : velocity[1]
})

import {
  Camera,
  type Context,
  Controls,
  defineEditorSystem,
  getFrameInput,
  getMouseInput,
  getPluginResources,
  Keyboard,
  type MouseInput,
} from '@woven-canvas/core'
import type { Vec2 } from '@woven-canvas/math'

import { GlideState, PanState, ScrollState, ZoomState } from '../components'
import { CONTROLS_PLUGIN_NAME } from '../constants'
import { smoothDamp } from '../helpers'
import { clampCameraToBounds } from '../helpers/clampCameraToBounds'
import type { CanvasControlsOptions } from '../types'
import { PanStateValue } from '../types'

/** Velocity threshold below which smooth scroll stops */
const VELOCITY_THRESHOLD = 0.5

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
 * Find the wheel event this frame, if the "scroll" tool is active for wheel input.
 * Returns null if there's no wheel event or wheel is mapped to another tool (e.g. zoom).
 *
 * The wheel event's own modifier flag counts toward mod detection — trackpad
 * pinch gestures report ctrlKey on the wheel event without any keydown, and
 * must not be treated as plain scrolling.
 */
function getScrollWheelEvent(ctx: Context, keyboardModDown: boolean) {
  const mouseEvents = getMouseInput(ctx)
  const wheelEvent = mouseEvents.find((e) => e.type === 'wheel') ?? null
  const modDown = keyboardModDown || (wheelEvent?.wheelModKey ?? false)
  if (!Controls.wheelActive(ctx, 'scroll', modDown)) return null
  return wheelEvent
}

/**
 * Resolve the scroll deltas for a wheel event, mapping shift+wheel to
 * horizontal scrolling.
 *
 * Browsers disagree on this: some (Firefox, and macOS in general) already
 * report shift+wheel as deltaX, others leave it on deltaY. Only swap when
 * deltaX is empty, so the already-horizontal case passes through untouched
 * and genuine two-axis trackpad scrolling is never rotated.
 *
 * The shift flag comes from the wheel event as well as the keyboard, since
 * keyboard state misses Shift pressed while the canvas lacked focus.
 */
function getScrollDeltas(wheelEvent: MouseInput, keyboardShiftDown: boolean): Vec2 {
  const shiftDown = keyboardShiftDown || wheelEvent.wheelShiftKey
  if (shiftDown && wheelEvent.wheelDeltaX === 0) {
    return [wheelEvent.wheelDeltaY, 0]
  }
  return [wheelEvent.wheelDeltaX, wheelEvent.wheelDeltaY]
}

/**
 * Post input scroll system - handles mouse scroll canvas panning.
 *
 * When smoothScroll is disabled, pans the canvas directly based on wheel deltas.
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
  // Defer when another system owns the camera (glide animation or hand-tool pan).
  // Reset any in-progress smooth scroll so it doesn't resume afterwards.

  if (PanState.read(ctx).state === PanStateValue.Panning || GlideState.read(ctx).active) {
    ScrollState.reset(ctx)
    return
  }

  const options = getPluginResources<CanvasControlsOptions>(ctx, CONTROLS_PLUGIN_NAME)
  const keyboard = Keyboard.read(ctx)
  const wheelEvent = getScrollWheelEvent(ctx, keyboard.modDown)

  // If a scroll event arrives while smooth zoom is animating, snap zoom to
  // its target so the camera position settles before we start scrolling.
  // Otherwise the zoom animation keeps shifting camera.left/top each frame,
  // pulling the scroll off course and causing diagonal drift.
  if (wheelEvent && ZoomState.read(ctx).active) {
    ZoomState.reset(ctx)
  }

  if (!options.smoothScroll.enabled) {
    // Direct scroll mode
    if (!wheelEvent) return

    const [deltaX, deltaY] = getScrollDeltas(wheelEvent, keyboard.shiftDown)
    const cam = Camera.write(ctx)
    cam.left = cam.left + deltaX / cam.zoom
    cam.top = cam.top + deltaY / cam.zoom
    if (options.cameraBounds) clampCameraToBounds(ctx, cam, options.cameraBounds)
    return
  }

  // Smooth scroll mode
  const camera = Camera.read(ctx)
  const state = ScrollState.read(ctx)
  let { active, targetLeft, targetTop, velocityX, velocityY } = state

  // Accumulate wheel deltas into target
  if (wheelEvent) {
    const [deltaX, deltaY] = getScrollDeltas(wheelEvent, keyboard.shiftDown)
    const dx = deltaX / camera.zoom
    const dy = deltaY / camera.zoom
    if (!active) {
      targetLeft = camera.left + dx
      targetTop = camera.top + dy
    } else {
      targetLeft += dx
      targetTop += dy
    }
    active = true
  }

  // Cancel smooth scroll momentum when a key is pressed (e.g. Ctrl for zoom).
  // We don't cancel on pointer-down so scrolling works while dragging a block.
  if (active && !wheelEvent && hasAnyKeyDown(keyboard.keysDownTrigger)) {
    ScrollState.reset(ctx)
    return
  }

  // Animate toward target
  if (!active) return

  const { delta } = getFrameInput(ctx)

  const { position, velocity } = smoothDamp(
    [camera.left, camera.top],
    [targetLeft, targetTop],
    [velocityX, velocityY],
    options.smoothScroll.time,
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

  // Enforce camera bounds
  if (options.cameraBounds) clampCameraToBounds(ctx, cam, options.cameraBounds)

  // Write scroll state
  const ss = ScrollState.write(ctx)
  ss.active = !done
  ss.targetLeft = targetLeft
  ss.targetTop = targetTop
  ss.velocityX = done ? 0 : velocity[0]
  ss.velocityY = done ? 0 : velocity[1]
})

import {
  Camera,
  type Context,
  defineEditorSystem,
  defineQuery,
  getPluginResources,
  Pointer,
  PointerType,
  Screen,
} from '@woven-canvas/core'
import { Vec2 } from '@woven-canvas/math'

import { PinchState } from '../components'
import type { CanvasControlsOptions } from '../types'

/**
 * Query for all pointer entities
 */
const pointerQuery = defineQuery((q) => q.with(Pointer))

/**
 * Post input pinch system - handles two-finger touch gestures.
 *
 * When exactly two touch pointers are active:
 * - Pinch to zoom: Changes in finger distance adjust zoom level
 * - Two-finger pan: Movement of the center point pans the canvas
 *
 * Runs late in the input phase (priority: -100) to process input after
 * core input systems have updated singletons.
 */
export const PostInputPinch = defineEditorSystem({ phase: 'input', priority: -100 }, (ctx: Context) => {
  const options = getPluginResources<CanvasControlsOptions>(ctx, 'controls')

  // Get all pointer entities
  const pointers = pointerQuery.current(ctx)

  // Filter for touch pointers only
  const touchPositions: Vec2[] = []
  for (let i = 0; i < pointers.length; i++) {
    const eid = pointers[i]
    const pointer = Pointer.read(ctx, eid)
    if (pointer.pointerType === PointerType.Touch) {
      touchPositions.push(pointer.position)
    }
  }

  // Only handle two-finger gestures
  if (touchPositions.length !== 2) {
    // Reset state when not in two-finger gesture
    const state = PinchState.read(ctx)
    if (state.active) {
      const writableState = PinchState.write(ctx)
      writableState.active = false
    }
    return
  }

  const [p1, p2] = touchPositions

  // Calculate current distance and center using Vec2 utilities
  const distance = Vec2.distance(p1, p2)
  const center = Vec2.midPoint(p1, p2)

  const state = PinchState.read(ctx)

  // If this is the start of a pinch gesture, just record initial values
  if (!state.active) {
    const pinch = PinchState.write(ctx)
    pinch.prevDistance = distance
    pinch.prevCenter = center
    pinch.active = true
    return
  }

  const camera = Camera.read(ctx)
  const screen = Screen.read(ctx)

  // Calculate zoom delta from distance change
  // Use ratio of distances for smooth exponential zoom
  if (state.prevDistance > 0 && distance > 0) {
    const zoomRatio = distance / state.prevDistance
    let newZoom = camera.zoom * zoomRatio

    // Clamp to min/max bounds
    newZoom = Math.min(options.maxZoom, Math.max(options.minZoom, newZoom))

    // Calculate viewport size change
    const cameraWidth = screen.width / camera.zoom
    const cameraHeight = screen.height / camera.zoom
    const newCameraWidth = screen.width / newZoom
    const newCameraHeight = screen.height / newZoom

    const dw = newCameraWidth - cameraWidth
    const dh = newCameraHeight - cameraHeight

    // Calculate pinch center as percentage of screen
    const percentX = center[0] / screen.width
    const percentY = center[1] / screen.height

    // Offset camera so world point under pinch center stays fixed
    const cam = Camera.write(ctx)
    cam.left -= percentX * dw
    cam.top -= percentY * dh
    cam.zoom = newZoom
  }

  // Calculate pan delta from center movement
  const centerDx = center[0] - state.prevCenter[0]
  const centerDy = center[1] - state.prevCenter[1]

  if (centerDx !== 0 || centerDy !== 0) {
    const cam = Camera.write(ctx)
    // Convert screen movement to world movement (divide by zoom)
    cam.left -= centerDx / cam.zoom
    cam.top -= centerDy / cam.zoom
  }

  // Update state for next frame
  const pinch = PinchState.write(ctx)
  pinch.prevDistance = distance
  pinch.prevCenter = center
})

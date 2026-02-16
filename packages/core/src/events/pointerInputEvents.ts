import { Vec2 } from '@infinitecanvas/math'
import { type Context, defineQuery, type EntityId } from '@woven-ecs/core'

import { Pointer, type PointerButton } from '../components'
import { Camera, Frame, Intersect, Key, Keyboard } from '../singletons'
import type { PointerInput, PointerInputOptions } from './types'

// Default thresholds for click detection
const DEFAULT_CLICK_MOVE_THRESHOLD = 3
const DEFAULT_CLICK_FRAME_THRESHOLD = 30

// Query for pointer entities with change tracking
const pointerQuery = defineQuery((q) => q.tracking(Pointer))

/**
 * Per-context state for tracking pointer events across frames.
 * Keyed by context readerId to support multiple editor instances.
 */
interface PointerTrackingState {
  /** Previous frame's pointer positions for movement detection */
  prevPositions: Map<number, Vec2>
  /** Previous modifier key state */
  prevModifiers: {
    shiftDown: boolean
    altDown: boolean
    modDown: boolean
  }
  /** Previous camera state for detecting camera movement during drag */
  prevCamera: {
    left: number
    top: number
    zoom: number
  }
}

const trackingState = new Map<string, PointerTrackingState>()

function getTrackingState(ctx: Context): PointerTrackingState {
  const key = ctx.readerId
  let state = trackingState.get(key)
  if (!state) {
    state = {
      prevPositions: new Map(),
      prevModifiers: {
        shiftDown: false,
        altDown: false,
        modDown: false,
      },
      prevCamera: {
        left: 0,
        top: 0,
        zoom: 1,
      },
    }
    trackingState.set(key, state)
  }
  return state
}

/**
 * Generate high-level pointer input events from ECS state for state machine consumption.
 *
 * This function transforms raw Pointer component data into semantic events
 * suitable for XState machines. It handles:
 *
 * - **pointerDown** - When a new pointer matching the specified buttons is added
 * - **pointerUp** - When a matching pointer is removed
 * - **pointerMove** - When a matching pointer's position changes, modifier keys change, or camera moves
 * - **click** - After pointerUp, if the pointer didn't move much and wasn't held long
 * - **cancel** - When Escape is pressed or multi-touch is detected
 * - **frame** - Optional continuous event while pointer is active
 *
 * @param ctx - ECS context
 * @param buttons - Array of pointer buttons to filter for (e.g., ['left', 'middle'])
 * @param options - Optional configuration
 * @returns Array of pointer input events to process
 *
 * @example
 * ```typescript
 * import { getPointerInput, runMachine } from '@infinitecanvas/plugin-xstate';
 *
 * const panSystem = defineSystem((ctx) => {
 *   const events = getPointerInput(ctx, ['middle']);
 *   if (events.length === 0) return;
 *
 *   const { value, context } = runMachine(panMachine, state.state, state.context, events);
 *   // Update state...
 * });
 * ```
 */
export function getPointerInput(
  ctx: Context,
  buttons: PointerButton[],
  options: PointerInputOptions = {},
): PointerInput[] {
  if (buttons.length === 0) return []

  const {
    includeFrameEvent = false,
    clickMoveThreshold = DEFAULT_CLICK_MOVE_THRESHOLD,
    clickFrameThreshold = DEFAULT_CLICK_FRAME_THRESHOLD,
  } = options

  const state = getTrackingState(ctx)
  const frameNumber = Frame.read(ctx).number

  const events: PointerInput[] = []

  // Get keyboard state for modifiers
  const keyboard = Keyboard.read(ctx)
  const modifiers = {
    shiftDown: keyboard.shiftDown,
    altDown: keyboard.altDown,
    modDown: keyboard.modDown,
  }

  // Get camera state
  const camera = Camera.read(ctx)

  // Helper to check if pointer button matches filter
  const matchesButtons = (entityId: EntityId) => {
    const pointer = Pointer.read(ctx, entityId)
    return buttons.includes(pointer.button)
  }

  // Get current intersects
  const intersects = Intersect.getAll(ctx)

  // Helper to create event from pointer
  const createEvent = (type: PointerInput['type'], entityId: EntityId): PointerInput => {
    const pointer = Pointer.read(ctx, entityId)
    const screenPos: Vec2 = [pointer.position[0], pointer.position[1]]
    const worldPos = Camera.toWorld(ctx, screenPos)

    return {
      type,
      ctx,
      screenPosition: screenPos,
      worldPosition: worldPos,
      velocity: [pointer._velocity[0], pointer._velocity[1]],
      pressure: pointer.pressure,
      button: pointer.button,
      pointerType: pointer.pointerType,
      obscured: pointer.obscured,
      shiftDown: modifiers.shiftDown,
      altDown: modifiers.altDown,
      modDown: modifiers.modDown,
      cameraLeft: camera.left,
      cameraTop: camera.top,
      cameraZoom: camera.zoom,
      pointerId: entityId,
      intersects,
    }
  }

  // Get query results
  const addedPointers = pointerQuery.added(ctx)
  const removedPointers = pointerQuery.removed(ctx)
  const changedPointers = pointerQuery.changed(ctx)
  const currentPointers = pointerQuery.current(ctx)

  // Filter by button
  const matchingAdded = addedPointers.filter(matchesButtons)
  const matchingRemoved = removedPointers.filter(matchesButtons)
  const matchingChanged = changedPointers.filter(matchesButtons)
  const matchingCurrent = Array.from(currentPointers).filter(matchesButtons)

  // Check for cancel conditions
  const escapePressed = Keyboard.isKeyDownTrigger(ctx, Key.Escape)
  const multiTouch = matchingCurrent.length > 1 && matchingAdded.length > 0

  if ((escapePressed || multiTouch) && matchingCurrent.length > 0) {
    // Generate cancel event using the first current pointer
    events.push(createEvent('cancel', matchingCurrent[0]))
    return events
  }

  // Handle pointer down (new pointer added, and we now have exactly 1 matching)
  if (matchingAdded.length > 0 && matchingCurrent.length === 1) {
    const entityId = matchingCurrent[0]
    const pointer = Pointer.read(ctx, entityId)

    // Only generate pointerDown if not obscured
    if (!pointer.obscured) {
      events.push(createEvent('pointerDown', entityId))

      // Store initial position for click detection
      state.prevPositions.set(entityId, [pointer.position[0], pointer.position[1]])
    }
  }

  // Handle pointer up (pointer removed, we now have 0 matching)
  if (matchingRemoved.length > 0 && matchingCurrent.length === 0) {
    const entityId = matchingRemoved[0]
    const pointer = Pointer.read(ctx, entityId)

    events.push(createEvent('pointerUp', entityId))

    // Check for click
    const downPos = state.prevPositions.get(entityId)
    if (downPos) {
      const currentPos: Vec2 = [pointer.position[0], pointer.position[1]]
      const dist = Vec2.distance(downPos, currentPos)
      const deltaFrame = frameNumber - pointer.downFrame

      if (dist < clickMoveThreshold && deltaFrame < clickFrameThreshold) {
        events.push(createEvent('click', entityId))
      }

      state.prevPositions.delete(entityId)
    }
  }

  // Handle pointer move (position changed, modifier keys changed, or camera moved)
  const modifiersChanged =
    modifiers.shiftDown !== state.prevModifiers.shiftDown ||
    modifiers.altDown !== state.prevModifiers.altDown ||
    modifiers.modDown !== state.prevModifiers.modDown

  const cameraChanged =
    camera.left !== state.prevCamera.left ||
    camera.top !== state.prevCamera.top ||
    camera.zoom !== state.prevCamera.zoom

  if ((matchingChanged.length > 0 || modifiersChanged || cameraChanged) && matchingCurrent.length === 1) {
    events.push(createEvent('pointerMove', matchingCurrent[0]))
  }

  // Handle frame event
  if (includeFrameEvent && matchingCurrent.length === 1) {
    events.push(createEvent('frame', matchingCurrent[0]))
  }

  // Update previous modifier and camera state
  state.prevModifiers = { ...modifiers }
  state.prevCamera = { left: camera.left, top: camera.top, zoom: camera.zoom }

  return events
}

/**
 * Clear tracking state for a context.
 * Call this when the editor is destroyed.
 *
 * @param ctx - ECS context
 */
export function clearPointerTrackingState(ctx: Context): void {
  trackingState.delete(ctx.readerId)
}

import {
  Camera,
  Controls,
  defineEditorSystem,
  type FrameInput,
  getFrameInput,
  getKeyboardInput,
  getPointerInput,
  type InferStateContext,
  Key,
  type KeyboardInput,
  type PointerInput,
} from '@woven-canvas/core'
import { assign, setup } from 'xstate'

import { PanState, PinchState } from '../components'
import { smoothDamp } from '../helpers'
import { PanStateValue } from '../types'

/** How long the glide should take to reach the target (seconds) */
const CAMERA_GLIDE_SECONDS = 0.1

/** Velocity threshold below which the glide stops */
const VELOCITY_THRESHOLD = 0.1

/**
 * Event types for the pan state machine.
 * Combines PointerInput, FrameInput, and KeyboardInput for full input handling.
 */
type PanEvent = PointerInput | FrameInput | KeyboardInput

/**
 * Pan state machine context - derived from PanState schema.
 */
type PanContext = InferStateContext<typeof PanState>

/**
 * Pan state machine - created once at module level.
 *
 * The ECS context is available on events (ctx property) so actions
 * can access Camera and other ECS state without recreating the machine.
 */
const panMachine = setup({
  types: {
    context: {} as PanContext,
    events: {} as PanEvent,
  },
  guards: {
    hasVelocity: ({ event }) => {
      if (event.type !== 'pointerUp') return false
      const velocity = (event as PointerInput).velocity
      return Math.hypot(velocity[0], velocity[1]) > VELOCITY_THRESHOLD
    },
    isGlideComplete: ({ context }) => {
      return Math.hypot(context.velocityX, context.velocityY) < VELOCITY_THRESHOLD
    },
    cameraWasMoved: ({ context, event }) => {
      const camera = Camera.read((event as FrameInput).ctx)
      return camera.left !== context.expectedLeft || camera.top !== context.expectedTop
    },
    isEscapeKey: ({ event }) => {
      return (event as KeyboardInput).key === Key.Escape
    },
  },
  actions: {
    setDragStart: assign({
      panStartX: ({ event }) => (event as PointerInput).worldPosition[0],
      panStartY: ({ event }) => (event as PointerInput).worldPosition[1],
    }),

    moveCamera: ({ context, event }) => {
      const e = event as PointerInput
      const { ctx } = e
      const deltaX = e.worldPosition[0] - context.panStartX
      const deltaY = e.worldPosition[1] - context.panStartY

      const cam = Camera.write(ctx)
      cam.left -= deltaX
      cam.top -= deltaY
    },

    startGlide: assign(({ event }) => {
      const e = event as PointerInput
      const { ctx } = e
      const camera = Camera.read(ctx)
      const zoom = e.cameraZoom

      // Convert screen velocity to world velocity
      const velocityX = -e.velocity[0] / zoom
      const velocityY = -e.velocity[1] / zoom

      return {
        velocityX,
        velocityY,
        targetX: camera.left + velocityX * CAMERA_GLIDE_SECONDS,
        targetY: camera.top + velocityY * CAMERA_GLIDE_SECONDS,
        expectedLeft: camera.left,
        expectedTop: camera.top,
      }
    }),

    animateGlide: assign(({ context, event }) => {
      const e = event as FrameInput
      const { ctx, delta } = e
      const camera = Camera.read(ctx)

      const { position, velocity: newVelocity } = smoothDamp(
        [camera.left, camera.top],
        [context.targetX, context.targetY],
        [context.velocityX, context.velocityY],
        CAMERA_GLIDE_SECONDS,
        Number.POSITIVE_INFINITY,
        delta,
      )

      // Update camera position
      const cam = Camera.write(ctx)
      cam.left = position[0]
      cam.top = position[1]

      return {
        velocityX: newVelocity[0],
        velocityY: newVelocity[1],
        expectedLeft: position[0],
        expectedTop: position[1],
      }
    }),

    resetContext: assign({
      panStartX: 0,
      panStartY: 0,
      velocityX: 0,
      velocityY: 0,
      targetX: 0,
      targetY: 0,
      expectedLeft: 0,
      expectedTop: 0,
    }),
  },
}).createMachine({
  id: 'pan',
  initial: PanStateValue.Idle,
  context: {
    panStartX: 0,
    panStartY: 0,
    velocityX: 0,
    velocityY: 0,
    targetX: 0,
    targetY: 0,
    expectedLeft: 0,
    expectedTop: 0,
  },
  states: {
    [PanStateValue.Idle]: {
      on: {
        pointerDown: {
          actions: 'setDragStart',
          target: PanStateValue.Panning,
        },
      },
    },
    [PanStateValue.Panning]: {
      entry: 'moveCamera',
      on: {
        pointerMove: {
          actions: 'moveCamera',
        },
        pointerUp: [
          {
            guard: 'hasVelocity',
            actions: 'startGlide',
            target: PanStateValue.Gliding,
          },
          {
            target: PanStateValue.Idle,
          },
        ],
        keyDown: {
          guard: 'isEscapeKey',
          target: PanStateValue.Idle,
        },
      },
    },
    [PanStateValue.Gliding]: {
      on: {
        frame: [
          // Stop glide if another system moved the camera
          {
            guard: 'cameraWasMoved',
            actions: 'resetContext',
            target: PanStateValue.Idle,
          },
          {
            guard: 'isGlideComplete',
            actions: 'resetContext',
            target: PanStateValue.Idle,
          },
          {
            actions: 'animateGlide',
          },
        ],
        // User can interrupt glide by starting a new pan
        pointerDown: {
          actions: ['resetContext', 'setDragStart'],
          target: PanStateValue.Panning,
        },
      },
    },
  },
})

/**
 * Post input pan system - handles dragging to pan the canvas.
 *
 * Uses an XState state machine to track pan state:
 * - Idle: Waiting for "hand" tool button press
 * - Panning: Dragging to pan the canvas
 * - Gliding: Smooth deceleration after releasing a pan with velocity
 *
 * Runs late in the input phase (priority: -100) to process input after
 * core input systems have updated singletons.
 *
 * Active when: A button mapped to the "hand" tool is held and dragged.
 */
export const PostInputPan = defineEditorSystem({ phase: 'input', priority: -100 }, (ctx) => {
  const currentState = PanState.read(ctx).state
  const pinchActive = PinchState.read(ctx).active

  // When pinch gesture is active, defer to PostInputPinch system.
  // Reset pan state to Idle so when pinch ends, we start fresh without a jump.
  if (pinchActive) {
    if (currentState !== PanStateValue.Idle) {
      PanState.copy(ctx, PanState.default())
    }
    return
  }

  // Get pointer events for buttons mapped to the "hand" tool
  const buttons = Controls.getButtons(ctx, 'hand')
  const pointerEvents = getPointerInput(ctx, buttons)

  // Build events array
  const events: PanEvent[] = [...pointerEvents]

  // Add frame event when gliding (to drive animation)
  if (currentState === PanStateValue.Gliding) {
    events.push(getFrameInput(ctx))
  }

  // Check for Escape key to cancel panning
  events.push(...getKeyboardInput(ctx, [Key.Escape]))

  if (events.length === 0) return

  // Run machine through events - EditorStateDef.run() handles
  // reading current state, running the machine, and writing back
  PanState.run(ctx, panMachine, events)
})

/**
 * @infinitecanvas/plugin-xstate
 *
 * XState state machine utilities for infinite canvas ECS applications.
 *
 * This plugin provides utilities for running XState machines synchronously
 * within ECS systems, along with event generators that transform raw input
 * data into semantic events suitable for state machines.
 *
 * @example
 * ```typescript
 * import { defineEditorSystem, EditorSingletonDef, field } from '@infinitecanvas/editor';
 * import { runMachine, getPointerInput, PointerInput } from '@infinitecanvas/plugin-xstate';
 * import { setup, assign } from 'xstate';
 *
 * // Define state singleton
 * const PanState = new EditorSingletonDef({
 *   state: field.enum(['idle', 'panning']).default('idle'),
 *   panStartX: field.float32().default(0),
 *   panStartY: field.float32().default(0),
 * }, { sync: 'none' });
 *
 * // Define machine
 * const panMachine = setup({
 *   types: {
 *     context: {} as { panStartX: number; panStartY: number },
 *     events: {} as PointerInput,
 *   },
 *   actions: {
 *     setDragStart: assign({
 *       panStartX: ({ event }) => event.worldPosition[0],
 *       panStartY: ({ event }) => event.worldPosition[1],
 *     }),
 *   },
 * }).createMachine({
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       on: { pointerDown: { actions: 'setDragStart', target: 'panning' } },
 *     },
 *     panning: {
 *       on: { pointerUp: 'idle' },
 *     },
 *   },
 * });
 *
 * // System
 * export const panSystem = defineEditorSystem((ctx) => {
 *   const events = getPointerInput(ctx, ['middle']);
 *   if (events.length === 0) return;
 *
 *   const state = PanState.read(ctx);
 *   const { value, context } = runMachine(
 *     panMachine,
 *     state.state,
 *     { panStartX: state.panStartX, panStartY: state.panStartY },
 *     events,
 *   );
 *
 *   const w = PanState.write(ctx);
 *   w.state = value;
 *   w.panStartX = context.panStartX;
 *   w.panStartY = context.panStartY;
 * });
 * ```
 *
 * @packageDocumentation
 */

// Core state machine runner
export { runMachine, type MachineResult } from "./runMachine";

// Event types
export type {
  PointerInput,
  PointerInputType,
  PointerInputOptions,
  MouseInput,
  MouseInputType,
} from "./events";

// Pointer input utilities
export {
  getPointerInput,
  getPointerPosition,
  getPointerWorldPosition,
  hasActivePointer,
  clearPointerTrackingState,
  setCameraProvider,
  resetCameraProvider,
  type CameraProvider,
} from "./events";

// Mouse input utilities
export {
  getMouseInput,
  didMouseWheel,
  didMouseMove,
  getMousePosition,
  getMouseWorldPosition,
  getMouseWheelDelta,
  setMouseCameraProvider,
  resetMouseCameraProvider,
} from "./events";

// Keyboard input utilities
export {
  isKeyDown,
  isKeyDownTrigger,
  isKeyUpTrigger,
  isShiftDown,
  isAltDown,
  isModDown,
  getModifiers,
  KeyCode,
} from "./events";

// Re-export useful types from plugin-input for convenience
export {
  PointerButton,
  PointerType,
} from "@infinitecanvas/plugin-input";

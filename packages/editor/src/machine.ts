import { type AnyStateMachine, transition } from "xstate";

/**
 * Result of running a state machine through events.
 */
export interface MachineResult<TState, TContext> {
  /** The resulting state value */
  value: TState;
  /** The resulting context */
  context: TContext;
}

/**
 * Run an XState machine synchronously through a batch of events.
 *
 * This is a stateless, functional approach to state machines that works well
 * with ECS systems. Instead of creating long-running actor instances, the
 * machine processes events in a single frame and returns the new state.
 *
 * @param machine - The XState machine definition
 * @param currentState - The current state value (e.g., 'idle', 'dragging')
 * @param context - The current machine context
 * @param events - Array of events to process
 * @returns The resulting state value and context
 *
 * @example
 * ```typescript
 * const panMachine = setup({
 *   types: {
 *     context: {} as { panStart: [number, number] },
 *     events: {} as PointerEvent,
 *   },
 *   actions: {
 *     setDragStart: assign({
 *       panStart: ({ event }) => event.worldPosition,
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
 * // In a system:
 * const events = getPointerEvents(ctx, ['left']);
 * const { value, context } = runMachine(
 *   panMachine,
 *   state.currentState,
 *   state.toContext(),
 *   events,
 * );
 * ```
 */
export function runMachine<TState extends string, TContext extends object>(
  machine: AnyStateMachine,
  currentState: TState,
  context: TContext,
  events: Array<{ type: string; [key: string]: unknown }>,
): MachineResult<TState, TContext> {
  if (events.length === 0) {
    return { value: currentState, context };
  }

  let state = machine.resolveState({
    value: String(currentState),
    context,
  });

  for (const event of events) {
    const [nextState, actions] = transition(machine, state, event);
    state = nextState;

    // Execute actions synchronously
    for (const action of actions) {
      if (typeof action.exec === "function") {
        action.exec(action.info, action.params);
      }
    }
  }

  return {
    value: state.value as TState,
    context: state.context as TContext,
  };
}

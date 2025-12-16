import type { Context } from "@infinitecanvas/ecs";
import type { AnyStateMachine } from "xstate";

import {
  EditorSingletonDef,
  type EditorSingletonOptions,
} from "./EditorSingletonDef";
import { runMachine } from "./machine";

/**
 * Schema type for state machine singletons.
 * Must include a 'state' field that stores the current state value.
 */
export interface StateSchema {
  /** The current state machine state value */
  state: { def: { type: "string" } };
  /** Additional context fields */
  [key: string]: { def: any };
}

/**
 * Infer the machine context type from a state schema.
 * Excludes the 'state' field since that's the state value, not context.
 */
type InferMachineContext<T extends StateSchema> = {
  [K in Exclude<keyof T, "state">]: T[K] extends { def: { default: infer D } }
    ? D extends () => infer R
      ? R
      : D
    : unknown;
};

/**
 * Editor singleton definition for XState state machine state storage.
 *
 * This class extends EditorSingletonDef to provide convenient methods
 * for working with XState machines in ECS systems.
 *
 * The schema must include a 'state' field for the current state value,
 * plus any additional fields for the machine context.
 *
 * @example
 * ```typescript
 * const PanStateSchema = {
 *   state: field.string().max(16).default("idle"),
 *   panStartX: field.float64().default(0),
 *   panStartY: field.float64().default(0),
 * };
 *
 * class PanStateDef extends EditorStateDef<typeof PanStateSchema> {
 *   constructor() {
 *     super(PanStateSchema, { sync: "none" });
 *   }
 * }
 *
 * export const PanState = new PanStateDef();
 *
 * // In a system:
 * const events = getPointerInput(ctx, ["middle"]);
 * if (events.length > 0) {
 *   PanState.run(ctx, createPanMachine(ctx), events);
 * }
 * ```
 */
export class EditorStateDef<
  T extends StateSchema
> extends EditorSingletonDef<T> {
  constructor(schema: T, options: EditorSingletonOptions = {}) {
    super(schema, options);
  }

  /**
   * Get the current state value.
   *
   * @param ctx - The ECS context
   * @returns The current state machine state value
   */
  getState(ctx: Context): string {
    return this.read(ctx).state as string;
  }

  /**
   * Get the machine context (all fields except 'state').
   *
   * @param ctx - The ECS context
   * @returns Plain object with context field values
   */
  getContext<TContext extends object = InferMachineContext<T>>(
    ctx: Context
  ): TContext {
    const snapshot = this.snapshot(ctx);
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(snapshot)) {
      if (key !== "state") {
        result[key] = snapshot[key as keyof typeof snapshot];
      }
    }

    return result as TContext;
  }

  /**
   * Run an XState machine through events and update the singleton state.
   *
   * This method encapsulates the common pattern of:
   * 1. Reading the current state and context
   * 2. Running the machine through events
   * 3. Writing the updated state and context back
   *
   * @param ctx - The ECS context
   * @param machine - The XState machine definition
   * @param events - Array of events to process (must have a 'type' property)
   * @returns The resulting state value and context
   *
   * @example
   * ```typescript
   * const capturePanSystem = defineSystem((ctx) => {
   *   const events = getPointerInput(ctx, ["middle"]);
   *   if (events.length === 0) return;
   *
   *   PanState.run(ctx, createPanMachine(ctx), events);
   * });
   * ```
   */
  run<
    TState extends string,
    TContext extends object = InferMachineContext<T>,
    TEvent extends { type: string } = { type: string }
  >(
    ctx: Context,
    machine: AnyStateMachine,
    events: TEvent[]
  ): { value: TState; context: TContext } {
    // Read current state
    const currentState = this.getState(ctx) as TState;
    const currentContext = this.getContext<TContext>(ctx);

    // Run machine through events
    const result = runMachine<TState, TContext>(
      machine,
      currentState,
      currentContext,
      events as unknown as Array<{ type: string; [key: string]: unknown }>
    );

    // Write updated state and context
    const writable = this.write(ctx);
    (writable as { state: string }).state = result.value;

    // Copy context fields back
    for (const [key, value] of Object.entries(result.context)) {
      (writable as Record<string, unknown>)[key] = value;
    }

    return result;
  }
}

/**
 * Define an editor state singleton for XState machine state storage.
 *
 * @param schema - The singleton schema (must include 'state' field)
 * @param options - Editor singleton options
 * @returns EditorStateDef instance
 *
 * @example
 * ```typescript
 * export const DragState = defineEditorState({
 *   state: field.string().max(16).default("idle"),
 *   startX: field.float64().default(0),
 *   startY: field.float64().default(0),
 * });
 * ```
 */
export function defineEditorState<T extends StateSchema>(
  schema: T,
  options: EditorSingletonOptions = {}
): EditorStateDef<T> {
  return new EditorStateDef(schema, options);
}

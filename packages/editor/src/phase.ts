import type { SystemFn, EditorContext } from "./types";

/**
 * System execution phases in order
 */
export type SystemPhase = "input" | "capture" | "update" | "render";

/**
 * Array of phases in execution order
 */
export const PHASE_ORDER: readonly SystemPhase[] = Object.freeze([
  "input",
  "capture",
  "update",
  "render",
] as const);

/**
 * A system registered with a specific phase
 */
export interface PhaseSystem {
  /** Which phase this system runs in */
  phase: SystemPhase;
  /** Unique name for this system */
  name: string;
  /** The system execution function */
  execute: SystemFn;
}

/**
 * Define an Input system - converts raw DOM events to ECS state.
 *
 * Input systems run first and are responsible for:
 * - Reading pointer/mouse position
 * - Tracking keyboard modifiers
 * - Normalizing touch events
 *
 * @param name - Unique system name
 * @param execute - System function
 * @returns A PhaseSystem for the input phase
 *
 * @example
 * ```typescript
 * const pointerInputSystem = defineInputSystem('pointer-input', (ctx) => {
 *   const pointer = Pointer.write(ctx);
 *   pointer.x = lastPointerEvent.clientX;
 *   pointer.y = lastPointerEvent.clientY;
 * });
 * ```
 */
export function defineInputSystem(name: string, execute: SystemFn): PhaseSystem {
  return { phase: "input", name, execute };
}

/**
 * Define a Capture system - detects targets and computes intersections.
 *
 * Capture systems run second and are responsible for:
 * - Hit testing (what's under the pointer)
 * - Hover state detection
 * - Selection target computation
 *
 * @param name - Unique system name
 * @param execute - System function
 * @returns A PhaseSystem for the capture phase
 *
 * @example
 * ```typescript
 * const hoverSystem = defineCaptureSystem('hover', (ctx) => {
 *   const pointer = Pointer.read(ctx);
 *   for (const eid of allBlocks.current(ctx)) {
 *     const block = Block.read(ctx, eid);
 *     if (pointInRect(pointer, block)) {
 *       addComponent(ctx, eid, Hovered);
 *     }
 *   }
 * });
 * ```
 */
export function defineCaptureSystem(name: string, execute: SystemFn): PhaseSystem {
  return { phase: "capture", name, execute };
}

/**
 * Define an Update system - modifies document state and processes commands.
 *
 * Update systems run third and are responsible for:
 * - Moving blocks
 * - Changing properties
 * - Processing user actions
 * - Command execution
 *
 * @param name - Unique system name
 * @param execute - System function
 * @returns A PhaseSystem for the update phase
 *
 * @example
 * ```typescript
 * const dragSystem = defineUpdateSystem('drag', (ctx) => {
 *   const pointer = Pointer.read(ctx);
 *   for (const eid of draggingBlocks.current(ctx)) {
 *     const block = Block.write(ctx, eid);
 *     block.left += pointer.deltaX;
 *     block.top += pointer.deltaY;
 *   }
 * });
 * ```
 */
export function defineUpdateSystem(name: string, execute: SystemFn): PhaseSystem {
  return { phase: "update", name, execute };
}

/**
 * Define a Render system - syncs ECS state to output.
 *
 * Render systems run last and are responsible for:
 * - Updating DOM elements
 * - Emitting events for UI frameworks
 * - Drawing to canvas
 * - Triggering store sync
 *
 * @param name - Unique system name
 * @param execute - System function
 * @returns A PhaseSystem for the render phase
 *
 * @example
 * ```typescript
 * const domRenderSystem = defineRenderSystem('dom-render', (ctx) => {
 *   for (const eid of blocksChanged.changed(ctx)) {
 *     const block = Block.read(ctx, eid);
 *     const el = document.querySelector(`[data-eid="${eid}"]`);
 *     if (el) {
 *       el.style.transform = `translate(${block.left}px, ${block.top}px)`;
 *     }
 *   }
 * });
 * ```
 */
export function defineRenderSystem(name: string, execute: SystemFn): PhaseSystem {
  return { phase: "render", name, execute };
}

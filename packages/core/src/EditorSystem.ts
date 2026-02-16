import type { Context } from "@woven-ecs/core";
import { MainThreadSystem } from "@woven-ecs/core";

import type { SystemPhase } from "./types";

/**
 * Editor system execution function.
 */
export type EditorSystemFunction = (ctx: Context) => void;

/**
 * Default priority for systems.
 * Systems with higher priority run first within a phase.
 */
export const DEFAULT_PRIORITY = 0;

/**
 * Editor system with phase and priority.
 *
 * Systems are grouped by phase and sorted by priority within each phase.
 * Higher priority means the system runs earlier in the phase.
 * Ties are broken by registration order (plugin order, then system order within plugin)
 * using JavaScript's stable sort.
 */
export interface EditorSystem {
  /** Wrapped ECS system for world.execute() compatibility */
  readonly _system: MainThreadSystem;
  /** Execution phase */
  readonly phase: SystemPhase;
  /** Priority within phase (higher = runs first). Default: 0 */
  readonly priority: number;
}

/**
 * Options for defining an editor system.
 */
export interface EditorSystemOptions {
  /** Execution phase */
  phase: SystemPhase;
  /** Priority within phase (higher = runs first). Default: 0 */
  priority?: number;
}

/**
 * Define an editor system with phase and priority.
 *
 * Systems are grouped by phase and sorted by priority within each phase.
 * Higher priority means the system runs earlier in the phase.
 *
 * @param options - System options including phase and optional priority
 * @param execute - System execution function
 * @returns EditorSystem instance
 *
 * @example
 * ```typescript
 * // Basic system in update phase
 * const mySystem = defineEditorSystem(
 *   { phase: "update" },
 *   (ctx) => {
 *     // System logic here
 *   }
 * );
 *
 * // High priority system that runs early in render phase
 * const earlyRenderSystem = defineEditorSystem(
 *   { phase: "render", priority: 100 },
 *   (ctx) => {
 *     // Runs before other render systems
 *   }
 * );
 *
 * // Low priority system that runs late in render phase
 * const lateRenderSystem = defineEditorSystem(
 *   { phase: "render", priority: -100 },
 *   (ctx) => {
 *     // Runs after other render systems
 *   }
 * );
 * ```
 */
export function defineEditorSystem(
  options: EditorSystemOptions,
  execute: EditorSystemFunction
): EditorSystem {
  return {
    _system: new MainThreadSystem(execute),
    phase: options.phase,
    priority: options.priority ?? DEFAULT_PRIORITY,
  };
}

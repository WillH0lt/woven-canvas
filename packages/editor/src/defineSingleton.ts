import {
  defineSingleton as ecsDefineSingleton,
  type SingletonDef,
  type ComponentSchema,
} from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface SingletonOptions {
  /**
   * How this singleton syncs across clients
   * @default 'none'
   */
  sync?: SyncBehavior;
}

/**
 * Define a Singleton - global state with exactly one instance per world.
 * Singletons are used for camera state, grid config, tool state, etc.
 *
 * @param schema - The singleton schema using field builders
 * @param options - Configuration options
 * @returns A singleton definition with editor metadata
 *
 * @example
 * ```typescript
 * import { defineSingleton, field } from '@infinitecanvas/editor';
 *
 * // Camera - synced as presence so others can "follow" you
 * export const Camera = defineSingleton({
 *   x: field.float64().default(0),
 *   y: field.float64().default(0),
 *   zoom: field.float64().default(1),
 * }, { sync: 'presence' });
 *
 * // Grid config - persisted as part of the document
 * export const GridConfig = defineSingleton({
 *   enabled: field.boolean().default(true),
 *   size: field.float32().default(20),
 *   snap: field.boolean().default(true),
 * }, { sync: 'document' });
 *
 * // Tool state - ephemeral, not synced
 * export const ToolState = defineSingleton({
 *   active: field.string().max(32).default('select'),
 * });
 * ```
 */
export function defineSingleton<T extends ComponentSchema>(
  schema: T,
  options: SingletonOptions = {}
): SingletonDef<T> & { __editor: EditorComponentMeta } {
  const def = ecsDefineSingleton(schema);
  return Object.assign(def, {
    __editor: {
      category: "singleton" as const,
      sync: options.sync ?? "none",
    },
  }) as SingletonDef<T> & { __editor: EditorComponentMeta };
}

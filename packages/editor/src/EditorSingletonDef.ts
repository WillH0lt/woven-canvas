import { SingletonDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorSingletonOptions {
  /**
   * How this singleton syncs across clients
   * @default 'none'
   */
  sync?: SyncBehavior;
}

/**
 * Base class for editor singletons. Extend this to define singletons
 * with editor-specific metadata and custom methods.
 *
 * @example
 * ```typescript
 * // Simple singleton using factory function
 * const Camera = defineSingleton({
 *   x: field.float64().default(0),
 *   y: field.float64().default(0),
 *   zoom: field.float64().default(1),
 * }, { sync: 'presence' });
 *
 * // Extended singleton with custom methods
 * class MouseDef extends EditorSingletonDef<typeof MouseSchema> {
 *   constructor() {
 *     super(MouseSchema, { sync: 'none' });
 *   }
 *
 *   didMove(ctx: EditorContext): boolean {
 *     return this.read(ctx).moveTrigger;
 *   }
 * }
 * export const Mouse = new MouseDef();
 * ```
 */
export class EditorSingletonDef<
  T extends ComponentSchema,
> extends SingletonDef<T> {
  readonly __editor: EditorComponentMeta;

  constructor(schema: T, options: EditorSingletonOptions = {}) {
    super(schema);
    this.__editor = {
      category: "singleton",
      sync: options.sync ?? "none",
    };
  }
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
  options: EditorSingletonOptions = {}
): EditorSingletonDef<T> {
  return new EditorSingletonDef(schema, options);
}

/**
 * Type alias for any EditorSingletonDef (used when the schema type doesn't matter)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEditorSingletonDef = EditorSingletonDef<any>;

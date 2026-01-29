import { SingletonDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior } from "./types";

export type SingletonEditorBehavior = Exclude<SyncBehavior, "ephemeral">;

/**
 * An editor-aware singleton definition with sync behavior metadata.
 * Created via `defineEditorSingleton()`.
 */
export class EditorSingletonDef<
  T extends ComponentSchema,
  N extends string = string,
> extends SingletonDef<T> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: N;

  /** Sync-specific metadata */
  readonly __sync: SingletonEditorBehavior;

  constructor(options: { name: N; sync?: SingletonEditorBehavior }, schema: T) {
    super(schema);
    this.name = options.name;
    this.__sync = options.sync ?? "none";
  }
}

/** Any editor singleton definition */
export type AnyEditorSingletonDef = EditorSingletonDef<ComponentSchema>;

/**
 * Define an editor singleton with a stable name for storage.
 *
 * @param options - Singleton options (name, sync behavior)
 * @param schema - Singleton schema built using field builders
 * @returns An EditorSingletonDef descriptor
 *
 * @example
 * ```typescript
 * export const Camera = defineEditorSingleton(
 *   { name: "camera" },
 *   {
 *     left: field.float64().default(0),
 *     top: field.float64().default(0),
 *     zoom: field.float64().default(1),
 *   },
 * );
 * ```
 */
export function defineEditorSingleton<
  N extends string,
  T extends ComponentSchema,
>(
  options: { name: N; sync?: SingletonEditorBehavior },
  schema: T,
): EditorSingletonDef<T, N> {
  return new EditorSingletonDef(options, schema);
}

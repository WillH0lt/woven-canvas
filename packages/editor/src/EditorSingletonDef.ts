import { SingletonDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorSingletonOptions {
  /**
   * How this singleton syncs across clients.
   * @default 'none'
   */
  sync?: SyncBehavior;
}

/**
 * An editor-aware singleton definition with sync behavior metadata.
 * Created via `defineEditorSingleton()`.
 */
export class EditorSingletonDef<
  T extends ComponentSchema
> extends SingletonDef<T> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: string;

  /** Editor-specific metadata */
  readonly __editor: EditorComponentMeta;

  constructor(name: string, schema: T, options: EditorSingletonOptions = {}) {
    super(schema);
    this.name = name;
    this.__editor = {
      sync: options.sync ?? "none",
    };
  }
}

export type AnyEditorSingletonDef = EditorSingletonDef<ComponentSchema>;

/**
 * Define an editor singleton with a stable name for storage.
 *
 * @param name - Stable identifier used for persistence and sync (e.g., "camera", "settings")
 * @param schema - Singleton schema built using field builders
 * @param options - Optional sync behavior configuration
 * @returns An EditorSingletonDef descriptor
 *
 * @example
 * ```typescript
 * export const Camera = defineEditorSingleton(
 *   "camera",
 *   {
 *     left: field.float64().default(0),
 *     top: field.float64().default(0),
 *     zoom: field.float64().default(1),
 *   },
 *   { sync: "none" }
 * );
 * ```
 */
export function defineEditorSingleton<T extends ComponentSchema>(
  name: string,
  schema: T,
  options: EditorSingletonOptions = {}
): EditorSingletonDef<T> {
  return new EditorSingletonDef(name, schema, options);
}

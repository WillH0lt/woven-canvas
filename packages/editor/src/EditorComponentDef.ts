import { ComponentDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorComponentOptions {
  /**
   * How this component syncs across clients.
   * @default 'none'
   */
  sync?: SyncBehavior;
}

/**
 * An editor-aware component definition with sync behavior metadata.
 * Created via `defineEditorComponent()`.
 */
export class EditorComponentDef<
  T extends ComponentSchema
> extends ComponentDef<T> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: string;

  /** Editor-specific metadata */
  readonly __editor: EditorComponentMeta;

  constructor(name: string, schema: T, options: EditorComponentOptions = {}) {
    super(schema, false);
    this.name = name;
    this.__editor = {
      sync: options.sync ?? "none",
    };
  }
}

export type AnyEditorComponentDef = EditorComponentDef<ComponentSchema>;

/**
 * Define an editor component with a stable name for storage.
 *
 * @param name - Stable identifier used for persistence and sync (e.g., "shapes", "blocks")
 * @param schema - Component schema built using field builders
 * @param options - Optional sync behavior configuration
 * @returns An EditorComponentDef descriptor
 *
 * @example
 * ```typescript
 * export const Shape = defineEditorComponent(
 *   "shapes",
 *   {
 *     position: field.tuple(field.float64(), 2).default([0, 0]),
 *     size: field.tuple(field.float64(), 2).default([50, 50]),
 *     color: field.string().max(16).default("#0f3460"),
 *   },
 *   { sync: "document" }
 * );
 * ```
 */
export function defineEditorComponent<T extends ComponentSchema>(
  name: string,
  schema: T,
  options: EditorComponentOptions = {}
): EditorComponentDef<T> {
  return new EditorComponentDef(name, schema, options);
}

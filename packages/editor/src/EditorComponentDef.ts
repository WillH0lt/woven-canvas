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
 *
 * Entity identity is stored in the Synced component's `id` field.
 */
export class EditorComponentDef<
  T extends ComponentSchema,
  N extends string = string
> extends ComponentDef<T> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: N;

  /** Editor-specific metadata */
  readonly __editor: EditorComponentMeta;

  constructor(name: N, schema: T, options: EditorComponentOptions = {}) {
    super(schema, false);
    this.name = name;
    this.__editor = {
      sync: options.sync ?? "none",
    };
  }
}

/** Any editor component definition */
export type AnyEditorComponentDef = EditorComponentDef<ComponentSchema>;

/**
 * Define an editor component with a stable name.
 *
 * Entity identity is stored in the Synced component's `id` field.
 * Add Synced to any entity you want persisted/synced.
 *
 * @param name - Stable identifier for the component (e.g., "shapes", "blocks")
 * @param schema - Component schema
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
 *   { sync: "document" }  // Optional - defaults to "none"
 * );
 * ```
 */
export function defineEditorComponent<
  N extends string,
  T extends ComponentSchema
>(name: N, schema: T, options: EditorComponentOptions = {}): EditorComponentDef<T, N> {
  return new EditorComponentDef(name, schema, options);
}

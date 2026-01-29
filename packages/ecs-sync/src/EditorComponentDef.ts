import { ComponentDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior } from "./types";

/**
 * An editor-aware component definition with sync behavior metadata.
 * Created via `defineEditorComponent()`.
 *
 * Entity identity is stored in the Synced component's `id` field.
 */
export class EditorComponentDef<
  T extends ComponentSchema,
  N extends string = string,
> extends ComponentDef<T> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: N;

  /** Sync-specific metadata */
  readonly __sync: SyncBehavior;

  constructor(options: { name: N; sync?: SyncBehavior }, schema: T) {
    super(schema, false);
    this.name = options.name;
    this.__sync = options.sync ?? "none";
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
 * @param options - Component options (name, sync behavior)
 * @param schema - Component schema
 * @returns  EditorComponentDef descriptor
 *
 * @example
 * ```typescript
 * export const Shape = defineEditorComponent(
 *   { name: "shapes", sync: "document" },
 *   {
 *     position: field.tuple(field.float64(), 2).default([0, 0]),
 *     size: field.tuple(field.float64(), 2).default([50, 50]),
 *     color: field.string().max(16).default("#0f3460"),
 *   },
 * );
 * ```
 */
export function defineEditorComponent<
  N extends string,
  T extends ComponentSchema,
>(
  options: { name: N; sync?: SyncBehavior },
  schema: T,
): EditorComponentDef<T, N> {
  return new EditorComponentDef(options, schema);
}

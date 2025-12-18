import {
  ComponentDef,
  field,
  type ComponentSchema,
  type StringFieldDef,
} from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorComponentOptions {
  /**
   * How this component syncs across clients.
   * @default 'none'
   */
  sync?: SyncBehavior;
}

/**
 * The internal schema with injected `_id` field.
 */
type EditorComponentSchema<T extends ComponentSchema> = T & {
  _id: { def: StringFieldDef };
};

/**
 * An editor-aware component definition with sync behavior metadata.
 * Created via `defineEditorComponent()`.
 *
 * The `id` field is automatically injected - users don't need to define it.
 * All entities with EditorComponents share a single UUID stored in `id`.
 */
export class EditorComponentDef<T extends ComponentSchema> extends ComponentDef<
  EditorComponentSchema<T>
> {
  /**
   * Stable identifier for storage and sync.
   * Use this instead of `_defId` for persistence keys.
   */
  readonly name: string;

  /** Editor-specific metadata */
  readonly __editor: EditorComponentMeta;

  constructor(name: string, schema: T, options: EditorComponentOptions = {}) {
    // Prevent user from defining `_id` - it's injected automatically
    if ("_id" in schema) {
      throw new Error(
        `EditorComponent "${name}" must not define an "_id" field. ` +
          `The _id field is automatically injected for entity identity.`
      );
    }

    // Inject the _id field into the schema
    const schemaWithId = {
      ...schema,
      _id: field.string().max(36),
    } as EditorComponentSchema<T>;

    super(schemaWithId, false);
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
 * The `id` field is automatically injected - you don't need to define it.
 * All EditorComponents on an entity share the same `id` (the entity's UUID).
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
export function defineEditorComponent<T extends ComponentSchema>(
  name: string,
  schema: T,
  options: EditorComponentOptions = {}
): EditorComponentDef<T> {
  return new EditorComponentDef(name, schema, options);
}

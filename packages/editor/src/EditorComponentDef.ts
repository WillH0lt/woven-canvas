import { ComponentDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta, DataCategory } from "./types";

export interface EditorComponentOptions {
  /**
   * How this component syncs across clients
   */
  sync?: SyncBehavior;
}

/**
 * Base class for editor components (blocks and meta). Extend this to define
 * components with editor-specific metadata and custom methods.
 *
 * For most use cases, prefer the more specific BlockDef or MetaDef classes,
 * or use the defineBlock/defineMeta factory functions.
 */
export class EditorComponentDef<
  T extends ComponentSchema,
> extends ComponentDef<T> {
  readonly __editor: EditorComponentMeta;

  constructor(
    schema: T,
    category: DataCategory,
    options: EditorComponentOptions = {}
  ) {
    super(schema, false);
    this.__editor = {
      category,
      sync: options.sync ?? (category === "block" ? "document" : "none"),
    };
  }
}

/**
 * Base class for Block components - primary entity data (position, size, content).
 * Blocks are the core document elements that users create and manipulate.
 *
 * @example
 * ```typescript
 * // Simple block using factory function
 * const Block = defineBlock({
 *   left: field.float64(),
 *   top: field.float64(),
 *   width: field.float64(),
 *   height: field.float64(),
 * });
 *
 * // Extended block with custom methods
 * class TransformDef extends BlockDef<typeof TransformSchema> {
 *   constructor() {
 *     super(TransformSchema);
 *   }
 *
 *   getCenter(ctx: EditorContext, entityId: EntityId): [number, number] {
 *     const t = this.read(ctx, entityId);
 *     return [t.left + t.width / 2, t.top + t.height / 2];
 *   }
 * }
 * export const Transform = new TransformDef();
 * ```
 */
export class BlockDef<T extends ComponentSchema> extends EditorComponentDef<T> {
  constructor(schema: T, options: EditorComponentOptions = {}) {
    super(schema, "block", { sync: "document", ...options });
  }
}

/**
 * Base class for Meta components - secondary entity data (selection, hover, effects).
 * Meta components provide additional data that modifies block behavior or appearance.
 *
 * @example
 * ```typescript
 * // Simple meta using factory function
 * const Selected = defineMeta({}, { sync: 'presence' });
 *
 * // Extended meta with custom methods
 * class PointerDef extends MetaDef<typeof PointerSchema> {
 *   constructor() {
 *     super(PointerSchema, { sync: 'none' });
 *   }
 *
 *   getVelocity(ctx: EditorContext, entityId: EntityId): [number, number] {
 *     const p = this.read(ctx, entityId);
 *     return [p._velocity[0], p._velocity[1]];
 *   }
 * }
 * export const Pointer = new PointerDef();
 * ```
 */
export class MetaDef<T extends ComponentSchema> extends EditorComponentDef<T> {
  constructor(schema: T, options: EditorComponentOptions = {}) {
    super(schema, "meta", options);
  }
}

/**
 * Define a Block component - primary entity data (position, size, content).
 * Blocks are the core document elements that users create and manipulate.
 *
 * @param schema - The component schema using field builders
 * @param options - Configuration options
 * @returns A component definition with editor metadata
 *
 * @example
 * ```typescript
 * import { defineBlock, field } from '@infinitecanvas/editor';
 *
 * export const Block = defineBlock({
 *   id: field.string().max(36),
 *   left: field.float64(),
 *   top: field.float64(),
 *   width: field.float64(),
 *   height: field.float64(),
 * });
 * ```
 */
export function defineBlock<T extends ComponentSchema>(
  schema: T,
  options: EditorComponentOptions = {}
): BlockDef<T> {
  return new BlockDef(schema, options);
}

/**
 * Define a Meta component - block metadata (effects, constraints, styles).
 * Meta components are persisted alongside their block and provide
 * additional data that modifies block behavior or appearance.
 *
 * @param schema - The component schema using field builders
 * @param options - Configuration options
 * @returns A component definition with editor metadata
 *
 * @example
 * ```typescript
 * import { defineMeta, field } from '@infinitecanvas/editor';
 *
 * // Selection state - synced as presence so others see what you select
 * export const Selected = defineMeta({}, { sync: 'presence' });
 *
 * // Shadow effect - persisted with the block
 * export const Shadow = defineMeta({
 *   blur: field.float32().default(10),
 *   offsetX: field.float32().default(0),
 *   offsetY: field.float32().default(4),
 *   color: field.string().max(32).default('rgba(0,0,0,0.2)'),
 * });
 * ```
 */
export function defineMeta<T extends ComponentSchema>(
  schema: T,
  options: EditorComponentOptions = {}
): MetaDef<T> {
  return new MetaDef(schema, options);
}

/**
 * Type alias for any EditorComponentDef (used when the schema type doesn't matter)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEditorComponentDef = EditorComponentDef<any>;

/**
 * Type alias for any BlockDef (used when the schema type doesn't matter)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlockDef = BlockDef<any>;

/**
 * Type alias for any MetaDef (used when the schema type doesn't matter)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMetaDef = MetaDef<any>;

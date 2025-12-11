import {
  defineComponent as ecsDefineComponent,
  type ComponentDef,
  type ComponentSchema,
} from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface BlockOptions {
  /**
   * How this component syncs across clients
   * @default 'document'
   */
  sync?: SyncBehavior;
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
  options: BlockOptions = {}
): ComponentDef<T> & { __editor: EditorComponentMeta } {
  const def = ecsDefineComponent(schema);
  return Object.assign(def, {
    __editor: {
      category: "block" as const,
      sync: options.sync ?? "document",
    },
  }) as ComponentDef<T> & { __editor: EditorComponentMeta };
}

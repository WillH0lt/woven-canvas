import {
  defineComponent as ecsDefineComponent,
  type ComponentDef,
  type ComponentSchema,
} from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface MetaOptions {
  /**
   * How this component syncs across clients
   * @default 'document'
   */
  sync?: SyncBehavior;
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
  options: MetaOptions = {}
): ComponentDef<T> & { __editor: EditorComponentMeta } {
  const def = ecsDefineComponent(schema);
  return Object.assign(def, {
    __editor: {
      category: "meta" as const,
      sync: options.sync ?? "document",
    },
  }) as ComponentDef<T> & { __editor: EditorComponentMeta };
}

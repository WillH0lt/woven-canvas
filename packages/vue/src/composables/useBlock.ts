import { inject, type InjectionKey, type ShallowRef } from "vue";
import {
  Block,
  type EntityId,
  type InferComponentType,
  type AnyEditorComponentDef,
} from "@infinitecanvas/editor";

type BlockData = InferComponentType<typeof Block.schema>;

/** Interface for accessing block refs from InfiniteCanvas */
export interface BlockRefs {
  getBlockRef: (entityId: EntityId) => ShallowRef<BlockData> | undefined;
  getComponentRef: (
    entityId: EntityId,
    name: string
  ) => ShallowRef<unknown> | undefined;
}

/** Injection key for block refs */
export const BLOCK_REFS_KEY: InjectionKey<BlockRefs> = Symbol("blockRefs");

/** Component def with name and schema for type inference */
type ComponentDefWithSchema = AnyEditorComponentDef & {
  name: string;
  schema: any;
};

/**
 * Composable for reactive block data with per-component granularity.
 * Must be used within an InfiniteCanvas component.
 *
 * @param entityId - The entity ID to get refs for
 * @param components - Array of component definitions to retrieve
 * @returns Object with `block` ref and component refs keyed by lowercase name
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useBlock } from "@infinitecanvas/vue";
 * import { Rect } from "./RectPlugin";
 *
 * const props = defineProps<{ entityId: EntityId }>();
 * const { block, rect } = useBlock(props.entityId, [Rect] as const);
 * </script>
 *
 * <template>
 *   <div :style="{ background: rect.color }">{{ block.tag }}</div>
 * </template>
 * ```
 */
export function useBlock<T extends readonly ComponentDefWithSchema[]>(
  entityId: EntityId,
  components: T
): { block: ShallowRef<BlockData> } & {
  [K in T[number] as Lowercase<K["name"]>]: ShallowRef<
    InferComponentType<K["schema"]>
  >;
} {
  const blockRefs = inject(BLOCK_REFS_KEY);
  if (!blockRefs) {
    throw new Error("useBlock must be used within an InfiniteCanvas component");
  }

  const blockRef = blockRefs.getBlockRef(entityId);
  if (!blockRef) {
    throw new Error(`No block found for entity ${entityId}`);
  }

  const result: Record<string, ShallowRef<unknown>> = {
    block: blockRef,
  };

  for (const componentDef of components) {
    const name = componentDef.name.toLowerCase();
    const ref = blockRefs.getComponentRef(entityId, name);
    if (!ref) {
      throw new Error(
        `Component "${componentDef.name}" not found on entity ${entityId}. ` +
          `Make sure the component is registered in the block definition.`
      );
    }
    result[name] = ref;
  }

  return result as { block: ShallowRef<BlockData> } & {
    [K in T[number] as Lowercase<K["name"]>]: ShallowRef<
      InferComponentType<K["schema"]>
    >;
  };
}

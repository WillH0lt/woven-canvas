import {
  inject,
  shallowRef,
  onUnmounted,
  watch,
  toValue,
  type ShallowRef,
  type MaybeRefOrGetter,
} from "vue";
import {
  hasComponent,
  type EntityId,
  type InferComponentType,
  type AnyEditorComponentDef,
} from "@infinitecanvas/editor";
import { ENTITY_REFS_KEY } from "../blockRefs";

/** Component def with name and schema for type inference */
type ComponentDefWithSchema = AnyEditorComponentDef & {
  name: string;
  schema: any;
};

/**
 * Composable for reactive access to a component across multiple entities.
 * Must be used within an InfiniteCanvas component.
 *
 * Handles dynamic entity ID arrays - automatically subscribes/unsubscribes
 * as entities are added or removed.
 *
 * @param entityIds - Reactive array of entity IDs
 * @param componentDef - The component definition
 * @returns Shallow ref with Map of entityId -> component data (or null if not present)
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useComponents } from "@infinitecanvas/vue";
 * import { Color } from "@infinitecanvas/editor";
 *
 * const props = defineProps<{ entityIds: EntityId[] }>();
 * const colors = useComponents(() => props.entityIds, Color);
 * // colors.value is Map<EntityId, ColorData | null>
 * </script>
 * ```
 */
export function useComponents<T extends ComponentDefWithSchema>(
  entityIds: MaybeRefOrGetter<EntityId[]>,
  componentDef: T
): ShallowRef<Map<EntityId, Readonly<InferComponentType<T["schema"]>> | null>> {
  const entityRefs = inject(ENTITY_REFS_KEY);
  if (!entityRefs) {
    throw new Error(
      "useComponents must be used within an InfiniteCanvas component"
    );
  }

  const componentsMap = shallowRef<
    Map<EntityId, InferComponentType<T["schema"]> | null>
  >(new Map());

  // Track active subscriptions
  const subscriptions = new Map<EntityId, () => void>();

  function subscribeToEntity(entityId: EntityId) {
    if (subscriptions.has(entityId)) return;

    // Try to eagerly read the initial value
    const editor = entityRefs!.getEditor();
    if (editor) {
      const ctx = editor._getContext();
      if (hasComponent(ctx, entityId, componentDef)) {
        const newMap = new Map(componentsMap.value);
        newMap.set(entityId, componentDef.snapshot(ctx, entityId));
        componentsMap.value = newMap;
      } else {
        const newMap = new Map(componentsMap.value);
        newMap.set(entityId, null);
        componentsMap.value = newMap;
      }
    }

    // Subscribe to component changes
    const unsubscribe = entityRefs!.subscribeComponent(
      entityId,
      componentDef.name,
      (value) => {
        const newMap = new Map(componentsMap.value);
        newMap.set(entityId, value as InferComponentType<T["schema"]> | null);
        componentsMap.value = newMap;
      }
    );

    subscriptions.set(entityId, unsubscribe);
  }

  function unsubscribeFromEntity(entityId: EntityId) {
    const unsubscribe = subscriptions.get(entityId);
    if (unsubscribe) {
      unsubscribe();
      subscriptions.delete(entityId);
      const newMap = new Map(componentsMap.value);
      newMap.delete(entityId);
      componentsMap.value = newMap;
    }
  }

  // Watch for changes in entityIds
  watch(
    () => toValue(entityIds),
    (newIds, oldIds) => {
      const newIdSet = new Set(newIds);
      const oldIdSet = new Set(oldIds ?? []);

      // Unsubscribe from removed entities
      for (const id of oldIdSet) {
        if (!newIdSet.has(id)) {
          unsubscribeFromEntity(id);
        }
      }

      // Subscribe to new entities
      for (const id of newIdSet) {
        if (!oldIdSet.has(id)) {
          subscribeToEntity(id);
        }
      }
    },
    { immediate: true }
  );

  // Cleanup all subscriptions on unmount
  onUnmounted(() => {
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe();
    }
    subscriptions.clear();
  });

  return componentsMap;
}

import {
  inject,
  shallowRef,
  onUnmounted,
  type ShallowRef,
  type Ref,
} from "vue";
import {
  defineQuery,
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
 * Query result item - entity ID plus typed component data (snapshots)
 */
export type QueryResultItem<T extends readonly ComponentDefWithSchema[]> = {
  entityId: EntityId;
} & {
  [K in T[number] as K["name"]]: ShallowRef<InferComponentType<K["schema"]>>;
};

/**
 * Composable for querying entities that have specific components.
 * Uses ECS defineQuery under the hood for efficient updates - only
 * rebuilds results when the set of matching entities changes.
 *
 * Each result item contains its own ShallowRefs that update when
 * component values change.
 *
 * @param components - Array of component definitions that entities must have
 * @returns Shallow ref with array of matching entities and their component refs
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useQuery } from "@infinitecanvas/vue";
 * import { Block } from "@infinitecanvas/editor";
 * import { Shape } from "./ShapePlugin";
 *
 * // Query all entities with Block and Shape components
 * const shapes = useQuery([Block, Shape] as const);
 * </script>
 *
 * <template>
 *   <div v-for="entity in shapes" :key="entity.entityId">
 *     Position: {{ entity.Block.value.position }}
 *     Color: {{ entity.Shape.value.color }}
 *   </div>
 * </template>
 * ```
 */
export function useQuery<T extends readonly ComponentDefWithSchema[]>(
  components: T
): Ref<QueryResultItem<T>[]> {
  const entityRefs = inject(ENTITY_REFS_KEY);
  if (!entityRefs) {
    throw new Error("useQuery must be used within an InfiniteCanvas component");
  }

  // Results ref - updated when entity set changes
  const results = shallowRef<QueryResultItem<T>[]>([]);

  // Create ECS query
  const queryDef = defineQuery((q) => q.with(...components));

  // Track per-entity refs and subscriptions
  // entityId -> { refs, unsubscribes }
  const entityState = new Map<
    EntityId,
    {
      refs: Record<string, ShallowRef<unknown>>;
      unsubscribes: (() => void)[];
    }
  >();

  // Track if we've initialized
  let initialized = false;

  // Create refs and subscriptions for an entity
  function createEntityState(entityId: EntityId): {
    refs: Record<string, ShallowRef<unknown>>;
    unsubscribes: (() => void)[];
  } {
    const editor = entityRefs!.getEditor();
    if (!editor) {
      return { refs: {}, unsubscribes: [] };
    }

    const ctx = editor._getContext();
    const refs: Record<string, ShallowRef<unknown>> = {};
    const unsubscribes: (() => void)[] = [];

    for (const componentDef of components) {
      // Create ref with initial snapshot value
      const componentRef = shallowRef(componentDef.snapshot(ctx, entityId));
      refs[componentDef.name] = componentRef;

      // Subscribe to changes
      const unsubscribe = entityRefs!.subscribeComponent(
        entityId,
        componentDef.name,
        (value) => {
          (componentRef as ShallowRef<unknown>).value = value;
        }
      );
      unsubscribes.push(unsubscribe);
    }

    return { refs, unsubscribes };
  }

  // Clean up an entity's subscriptions
  function cleanupEntity(entityId: EntityId) {
    const state = entityState.get(entityId);
    if (state) {
      for (const unsubscribe of state.unsubscribes) {
        unsubscribe();
      }
      entityState.delete(entityId);
    }
  }

  // Build result items from current entity states
  function buildResults(): QueryResultItem<T>[] {
    const items: QueryResultItem<T>[] = [];

    for (const [entityId, state] of entityState) {
      items.push({
        entityId,
        ...state.refs,
      } as QueryResultItem<T>);
    }

    return items;
  }

  // Called on each tick by InfiniteCanvas
  function onTick() {
    const editor = entityRefs!.getEditor();
    if (!editor) return;

    const ctx = editor._getContext();

    // Initialize on first tick with editor available
    if (!initialized) {
      const currentIds = queryDef.current(ctx);
      for (const entityId of currentIds) {
        entityState.set(entityId, createEntityState(entityId));
      }
      results.value = buildResults();
      initialized = true;
      return;
    }

    // Check if any entities were added or removed from the query
    const added = queryDef.added(ctx);
    const removed = queryDef.removed(ctx);

    let changed = false;

    // Handle removed entities
    for (const entityId of removed) {
      cleanupEntity(entityId);
      changed = true;
    }

    // Handle added entities
    for (const entityId of added) {
      if (!entityState.has(entityId)) {
        entityState.set(entityId, createEntityState(entityId));
        changed = true;
      }
    }

    // Rebuild results if query changed
    if (changed) {
      results.value = buildResults();
    }
  }

  // Register tick callback with InfiniteCanvas
  const unregisterTick = entityRefs.registerTickCallback(onTick);

  // Cleanup on unmount
  onUnmounted(() => {
    unregisterTick();
    // Clean up all entity subscriptions
    for (const entityId of entityState.keys()) {
      cleanupEntity(entityId);
    }
  });

  return results;
}

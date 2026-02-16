import { inject, shallowRef, onUnmounted, type ShallowRef } from "vue";
import {
  hasComponent,
  type EntityId,
  type InferCanvasComponentType,
  type AnyCanvasComponentDef,
} from "@infinitecanvas/core";
import { INFINITE_CANVAS_KEY } from "../injection";

/** Component def with name and schema for type inference */
type ComponentDefWithSchema = AnyCanvasComponentDef & {
  name: string;
  schema: any;
};

/**
 * Composable for reactive access to a single component on an entity.
 * Must be used within an InfiniteCanvas component.
 *
 * Returns a shallow ref with the component data or null if not present.
 * The ref updates reactively when the component is added/removed/changed.
 *
 * Creates its own ref on demand and subscribes to component changes.
 * The initial value is eagerly read using componentDef.snapshot().
 *
 * @param entityId - The entity ID to get the component for
 * @param componentDef - The component definition
 * @returns Shallow ref with component data or null
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useComponent } from "@infinitecanvas/vue";
 * import { Selected, Hovered } from "@infinitecanvas/core";
 *
 * const props = defineProps<{ entityId: EntityId }>();
 * const selected = useComponent(props.entityId, Selected);
 * const hovered = useComponent(props.entityId, Hovered);
 * // selected.value is { selectedBy: string } | null
 * // hovered.value is {} | null
 * </script>
 *
 * <template>
 *   <div :class="{ selected: selected !== null, hovered: hovered !== null }">
 *     <span v-if="selected">Selected by: {{ selected.selectedBy }}</span>
 *   </div>
 * </template>
 * ```
 */
export function useComponent<T extends ComponentDefWithSchema>(
  entityId: EntityId,
  componentDef: T,
): ShallowRef<Readonly<InferCanvasComponentType<T["schema"]>> | null> {
  const canvasContext = inject(INFINITE_CANVAS_KEY);
  if (!canvasContext) {
    throw new Error(
      "useComponent must be used within an InfiniteCanvas component",
    );
  }

  // Create our own ref for this component
  const componentRef = shallowRef<InferCanvasComponentType<T["schema"]> | null>(
    null,
  );

  // Try to eagerly read the initial value
  const editor = canvasContext.getEditor();
  if (editor) {
    const ctx = editor._getContext();
    if (hasComponent(ctx, entityId, componentDef)) {
      componentRef.value = componentDef.snapshot(ctx, entityId);
    }
  }

  // Subscribe to component changes
  const unsubscribe = canvasContext.subscribeComponent(
    entityId,
    componentDef.name,
    (value) => {
      componentRef.value = value as InferCanvasComponentType<
        T["schema"]
      > | null;
    },
  );

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return componentRef;
}

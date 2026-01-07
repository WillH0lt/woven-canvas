import { inject, shallowRef, onUnmounted, type ShallowRef } from "vue";
import {
  type InferComponentType,
  type AnyEditorSingletonDef,
} from "@infinitecanvas/editor";
import { ENTITY_REFS_KEY } from "../blockRefs";

/** Singleton def with name and schema for type inference */
type SingletonDefWithSchema = AnyEditorSingletonDef & {
  name: string;
  schema: any;
};

/**
 * Composable for reactive access to an ECS singleton.
 * Returns a shallow ref that tracks the singleton's value.
 *
 * Creates its own ref on demand and subscribes to singleton changes.
 * The initial value is eagerly read using singletonDef.snapshot().
 *
 * @param singletonDef - The singleton definition (e.g., Camera, Mouse)
 * @returns Shallow ref with the singleton data, updated when ECS events fire
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useSingleton } from "@infinitecanvas/vue";
 * import { Camera, Mouse } from "@infinitecanvas/editor";
 *
 * const camera = useSingleton(Camera);
 * const mouse = useSingleton(Mouse);
 * </script>
 *
 * <template>
 *   <div>
 *     Camera: {{ camera.left }}, {{ camera.top }} @ {{ camera.zoom }}x
 *     Mouse: {{ mouse.x }}, {{ mouse.y }}
 *   </div>
 * </template>
 * ```
 */
export function useSingleton<T extends SingletonDefWithSchema>(
  singletonDef: T
): ShallowRef<Readonly<InferComponentType<T["schema"]>>> {
  const entityRefs = inject(ENTITY_REFS_KEY);
  if (!entityRefs) {
    throw new Error(
      "useSingleton must be used within an InfiniteCanvas component"
    );
  }

  // Create our own ref for this singleton
  const singletonRef = shallowRef<InferComponentType<T["schema"]>>(
    {} as InferComponentType<T["schema"]>
  );

  // Try to eagerly read the initial value
  const editor = entityRefs.getEditor();
  if (editor) {
    const ctx = editor._getContext();
    singletonRef.value = singletonDef.snapshot(ctx);
  }

  // Subscribe to singleton changes
  const unsubscribe = entityRefs.subscribeSingleton(
    singletonDef.name,
    (value) => {
      singletonRef.value = (value ?? {}) as InferComponentType<T["schema"]>;
    }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return singletonRef;
}

import type { AnyCanvasSingletonDef, InferCanvasComponentType } from '@infinitecanvas/core'
import { inject, onUnmounted, type ShallowRef, shallowRef } from 'vue'
import { INFINITE_CANVAS_KEY } from '../injection'

/** Singleton def with name and schema for type inference */
type SingletonDefWithSchema = AnyCanvasSingletonDef & {
  name: string
  schema: any
}

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
 * import { Camera, Mouse } from "@infinitecanvas/core";
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
  singletonDef: T,
): ShallowRef<Readonly<InferCanvasComponentType<T['schema']>>> {
  const canvasContext = inject(INFINITE_CANVAS_KEY)
  if (!canvasContext) {
    throw new Error('useSingleton must be used within an InfiniteCanvas component')
  }

  // Create our own ref for this singleton
  const singletonRef = shallowRef<InferCanvasComponentType<T['schema']>>(singletonDef.default())

  // Try to eagerly read the initial value
  const editor = canvasContext.getEditor()
  if (editor) {
    const ctx = editor._getContext()
    singletonRef.value = singletonDef.snapshot(ctx)
  }

  // Subscribe to singleton changes
  const unsubscribe = canvasContext.subscribeSingleton(singletonDef.name, (value) => {
    singletonRef.value = (value ?? {}) as InferCanvasComponentType<T['schema']>
  })

  // Register a one-time tick callback to read the initial value once editor is ready
  // This handles the case where the singleton already has a value but no CHANGED event fires
  let unregisterTick: (() => void) | null = null
  if (!editor) {
    unregisterTick = canvasContext.registerTickCallback(() => {
      const ed = canvasContext.getEditor()
      if (ed) {
        const ctx = ed._getContext()
        singletonRef.value = singletonDef.snapshot(ctx)
        // Unregister after first successful read
        unregisterTick?.()
        unregisterTick = null
      }
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
    unregisterTick?.()
  })

  return singletonRef
}

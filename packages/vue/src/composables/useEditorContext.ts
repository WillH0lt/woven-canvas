import type { Context, Editor } from '@woven-canvas/core'
import { inject } from 'vue'
import { WOVEN_CANVAS_KEY } from '../injection'

export interface EditorContext {
  /**
   * Get the editor instance directly.
   * Returns null if the editor hasn't initialized yet.
   *
   * @returns The Editor instance or null
   */
  getEditor(): Editor | null

  /**
   * Execute a callback on the next editor tick.
   * This is the recommended way to make changes to the editor state.
   *
   * Can be used with a callback or as a promise:
   *
   * @param callback - Optional function that receives the context for making changes
   * @returns Promise that resolves with the context
   *
   * @example
   * ```typescript
   * const { nextEditorTick } = useEditorContext();
   *
   * // Callback style
   * function handleClick() {
   *   nextEditorTick((ctx) => {
   *     const shape = Shape.write(ctx, entityId);
   *     shape.border = 10;
   *   });
   * }
   *
   * // Promise style
   * async function handleClick() {
   *   const ctx = await nextEditorTick();
   *   const shape = Shape.write(ctx, entityId);
   *   shape.border = 10;
   * }
   * ```
   */
  nextEditorTick(callback?: (ctx: Context) => void): Promise<Context>
}

/**
 * Composable for accessing the editor context.
 * Must be used within a WovenCanvas component.
 *
 * Provides methods to schedule changes to the editor state.
 *
 * @returns EditorContext object with nextEditorTick method
 * @throws Error if used outside of WovenCanvas
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useEditorContext } from "@woven-canvas/vue";
 * import { Shape } from "./Shape";
 *
 * const props = defineProps<{ entityId: EntityId }>();
 * const { nextEditorTick } = useEditorContext();
 *
 * function updateBorder(newBorder: number) {
 *   nextEditorTick((ctx) => {
 *     const shape = Shape.write(ctx, props.entityId);
 *     shape.border = newBorder;
 *   });
 * }
 * </script>
 * ```
 */
export function useEditorContext(): EditorContext {
  const canvasContext = inject(WOVEN_CANVAS_KEY)
  if (!canvasContext) {
    throw new Error('useEditorContext must be used within a WovenCanvas component')
  }

  return {
    getEditor: () => canvasContext.getEditor(),
    nextEditorTick(callback?: (ctx: Context) => void): Promise<Context> {
      return new Promise((resolve) => {
        const editor = canvasContext.getEditor()
        if (editor) {
          editor.nextTick((ctx) => {
            callback?.(ctx)
            resolve(ctx)
          })
        }
      })
    },
  }
}

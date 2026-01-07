import { inject } from "vue";
import type { Context, Editor } from "@infinitecanvas/editor";
import { INFINITE_CANVAS_KEY } from "../injection";

export interface EditorContext {
  /**
   * Execute a callback on the next editor tick.
   * This is the recommended way to make changes to the editor state.
   *
   * @param callback - Function that receives the context for making changes
   *
   * @example
   * ```typescript
   * const { nextEditorTick } = useEditorContext();
   *
   * function handleClick() {
   *   nextEditorTick((ctx) => {
   *     const shape = Shape.write(ctx, entityId);
   *     shape.border = 10;
   *   });
   * }
   * ```
   */
  nextEditorTick(callback: (ctx: Context) => void): void;
}

/**
 * Composable for accessing the editor context.
 * Must be used within an InfiniteCanvas component.
 *
 * Provides methods to schedule changes to the editor state.
 *
 * @returns EditorContext object with nextEditorTick method
 * @throws Error if used outside of InfiniteCanvas
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useEditorContext } from "@infinitecanvas/vue";
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
  const canvasContext = inject(INFINITE_CANVAS_KEY);
  if (!canvasContext) {
    throw new Error(
      "useEditorContext must be used within an InfiniteCanvas component"
    );
  }

  return {
    nextEditorTick(callback: (ctx: Context) => void) {
      const editor = canvasContext.getEditor();
      if (editor) {
        editor.nextTick(callback);
      }
    },
  };
}

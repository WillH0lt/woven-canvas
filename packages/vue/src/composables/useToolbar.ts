import { inject, computed } from "vue";
import { TOOLBAR_KEY } from "../injection";

/**
 * Composable for accessing toolbar context from within tool components.
 * Must be used within a Toolbar component.
 *
 * @returns Toolbar context with methods to control tool state
 * @throws Error if used outside of Toolbar
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useToolbar } from "@infinitecanvas/vue";
 *
 * const { activeTool, setTool, isActive } = useToolbar();
 *
 * // Check if this tool is active
 * const isShapeActive = isActive("shape");
 *
 * // Set the active tool
 * function handleClick() {
 *   setTool("shape", JSON.stringify(mySnapshot));
 * }
 * </script>
 * ```
 */
export function useToolbar() {
  const context = inject(TOOLBAR_KEY);
  if (!context) {
    throw new Error("useToolbar must be used within a Toolbar component");
  }

  return {
    /** The currently active tool name */
    activeTool: context.activeTool,

    /** The tool currently being held (pointer down) */
    heldTool: context.heldTool,

    /** Set the active tool */
    setTool: context.setTool,

    /** Handle drag-out for a tool (creates block and starts dragging) */
    dragOutTool: context.dragOutTool,

    /** Register a pointer down on a tool button */
    onToolPointerDown: context.onToolPointerDown,

    /** Register a pointer up on a tool button */
    onToolPointerUp: context.onToolPointerUp,

    /**
     * Check if a specific tool is currently active
     * @param toolName - The tool name to check
     * @returns Computed ref that is true when the tool is active
     */
    isActive: (toolName: string) => computed(() => context.activeTool.value === toolName),
  };
}

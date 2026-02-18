import type { FontFamily } from '@woven-canvas/core'
import { computed, inject } from 'vue'
import { WOVEN_CANVAS_KEY } from '../injection'

/**
 * Composable for accessing the editor's registered fonts.
 * Must be used within a WovenCanvas component.
 *
 * Returns the list of fonts configured in the editor, filtered to only
 * include selectable fonts (fonts with `selectable: true`).
 *
 * @returns Computed array of selectable FontFamily objects
 * @throws Error if used outside of WovenCanvas
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useFonts } from "@woven-canvas/vue";
 *
 * const fonts = useFonts();
 * // fonts.value is an array of FontFamily objects
 * </script>
 *
 * <template>
 *   <select>
 *     <option v-for="font in fonts" :key="font.name" :value="font.name">
 *       {{ font.displayName }}
 *     </option>
 *   </select>
 * </template>
 * ```
 */
export function useFonts() {
  const canvasContext = inject(WOVEN_CANVAS_KEY)
  if (!canvasContext) {
    throw new Error('useFonts must be used within a WovenCanvas component')
  }

  return computed<FontFamily[]>(() => {
    const editor = canvasContext.getEditor()
    if (!editor) {
      return []
    }

    // Return only selectable fonts
    return editor.fonts.filter((font) => font.selectable)
  })
}

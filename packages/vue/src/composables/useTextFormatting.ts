import type { EntityId, TextAlignment } from '@infinitecanvas/core'
import { type ComputedRef, computed, type MaybeRefOrGetter } from 'vue'
import { useTextBatchController } from './useTextBatchController'
import { useTextEditorController } from './useTextEditorController'

export interface TextFormattingState {
  /** Whether there is an active editor or text entities to edit */
  hasTextToFormat: ComputedRef<boolean>
  /** Whether the current text is bold */
  isBold: ComputedRef<boolean>
  /** Whether the current text is italic */
  isItalic: ComputedRef<boolean>
  /** Whether the current text is underlined */
  isUnderline: ComputedRef<boolean>
  /** Current text alignment */
  alignment: ComputedRef<TextAlignment>
  /** Current text color (null if mixed or none) */
  color: ComputedRef<string | null>
  /** Current font size (null if mixed) */
  fontSize: ComputedRef<number | null>
  /** Current font family (null if mixed) */
  fontFamily: ComputedRef<string | null>
}

export interface TextFormattingCommands {
  /** Toggle bold formatting */
  toggleBold(): void
  /** Toggle italic formatting */
  toggleItalic(): void
  /** Toggle underline formatting */
  toggleUnderline(): void
  /** Set text alignment */
  setAlignment(alignment: TextAlignment): void
  /** Set text color */
  setColor(color: string): void
  /** Set font size */
  setFontSize(size: number): void
  /** Set font family */
  setFontFamily(family: string): void
}

export interface TextFormattingController {
  /** Reactive state for text formatting */
  state: TextFormattingState
  /** Commands to modify text formatting */
  commands: TextFormattingCommands
}

/**
 * Unified composable for text formatting that automatically switches between
 * editor mode (single text being edited) and batch mode (multiple texts selected).
 *
 * - When a TipTap editor is active: uses useTextEditorController
 * - When no editor is active: uses useTextBatchController
 *
 * @param entityIds - Reactive array of selected entity IDs
 *
 * @example
 * ```vue
 * <script setup>
 * const { state, commands } = useTextFormatting(() => props.entityIds);
 * </script>
 *
 * <template>
 *   <button :class="{ active: state.isBold.value }" @click="commands.toggleBold">
 *     Bold
 *   </button>
 * </template>
 * ```
 */
export function useTextFormatting(entityIds: MaybeRefOrGetter<EntityId[]>): TextFormattingController {
  const editorController = useTextEditorController()
  const batchController = useTextBatchController(entityIds)

  const hasEditor = editorController.state.hasEditor

  const state: TextFormattingState = {
    hasTextToFormat: computed(() => {
      return hasEditor.value || batchController.state.hasTextEntities.value
    }),

    isBold: computed(() => {
      if (hasEditor.value) {
        return editorController.state.isBold.value
      }
      return batchController.state.isBold.value === true
    }),

    isItalic: computed(() => {
      if (hasEditor.value) {
        return editorController.state.isItalic.value
      }
      return batchController.state.isItalic.value === true
    }),

    isUnderline: computed(() => {
      if (hasEditor.value) {
        return editorController.state.isUnderline.value
      }
      return batchController.state.isUnderline.value === true
    }),

    alignment: computed(() => {
      if (hasEditor.value) {
        return editorController.state.alignment.value
      }
      return batchController.state.alignment.value ?? 'left'
    }),

    color: computed(() => {
      if (hasEditor.value) {
        return editorController.state.color.value
      }
      return batchController.state.color.value
    }),

    // fontSize and fontFamily are component-level properties, always use batchController
    fontSize: computed(() => batchController.state.fontSize.value),

    fontFamily: computed(() => batchController.state.fontFamily.value),
  }

  const commands: TextFormattingCommands = {
    toggleBold() {
      if (hasEditor.value) {
        editorController.commands.toggleBold()
      } else {
        batchController.commands.toggleBold()
      }
    },

    toggleItalic() {
      if (hasEditor.value) {
        editorController.commands.toggleItalic()
      } else {
        batchController.commands.toggleItalic()
      }
    },

    toggleUnderline() {
      if (hasEditor.value) {
        editorController.commands.toggleUnderline()
      } else {
        batchController.commands.toggleUnderline()
      }
    },

    setAlignment(alignment: TextAlignment) {
      if (hasEditor.value) {
        editorController.commands.setAlignment(alignment)
      } else {
        batchController.commands.setAlignment(alignment)
      }
    },

    setColor(color: string) {
      if (hasEditor.value) {
        editorController.commands.setColor(color)
      } else {
        batchController.commands.setColor(color)
      }
    },

    // fontSize and fontFamily are component-level properties, always use batchController
    setFontSize(size: number) {
      batchController.commands.setFontSize(size)
    },

    setFontFamily(family: string) {
      batchController.commands.setFontFamily(family)
    },
  }

  return {
    state,
    commands,
  }
}

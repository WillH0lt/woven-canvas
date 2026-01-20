import { shallowRef, computed, type ShallowRef, type ComputedRef } from "vue";
import type { Editor } from "@tiptap/vue-3";
import { type TextAlignment } from "@infinitecanvas/editor";

import { normalizeColor } from "../utils/color";

export interface TextEditorState {
  /** Whether there is an active text editor */
  hasEditor: ComputedRef<boolean>;
  /** Whether the current selection has bold formatting */
  isBold: ComputedRef<boolean>;
  /** Whether the current selection has italic formatting */
  isItalic: ComputedRef<boolean>;
  /** Whether the current selection has underline formatting */
  isUnderline: ComputedRef<boolean>;
  /** Current text alignment */
  alignment: ComputedRef<TextAlignment>;
  /** Current text color (null if mixed or no selection) */
  color: ComputedRef<string | null>;
}

export interface TextEditorCommands {
  /** Toggle bold formatting on current selection */
  toggleBold(): void;
  /** Toggle italic formatting on current selection */
  toggleItalic(): void;
  /** Toggle underline formatting on current selection */
  toggleUnderline(): void;
  /** Set text alignment */
  setAlignment(alignment: TextAlignment): void;
  /** Set text color */
  setColor(color: string): void;
}

export interface TextEditorController {
  /** Reference to the active editor (null if none) */
  editor: ShallowRef<Editor | null>;
  /** Reference to the active editing element (null if none) */
  blockElement: ShallowRef<HTMLElement | null>;
  /** Reactive state computed from the active editor */
  state: TextEditorState;
  /** Commands to manipulate the active editor */
  commands: TextEditorCommands;
  /** Register an editor and element as active (called by EditableText) */
  register(editor: Editor, blockElement: HTMLElement): void;
  /** Unregister the active editor and element (called by EditableText) */
  unregister(): void;
}

// Module-level singleton state
const activeEditor = shallowRef<Editor | null>(null);
const activeBlockElement = shallowRef<HTMLElement | null>(null);

// Track selection/transaction updates to trigger reactivity
const updateCounter = shallowRef(0);

/**
 * Composable for controlling text editors from the floating menu.
 *
 * This provides a centralized way for floating menu buttons to interact
 * with the currently active TipTap editor in an EditableText component.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTextEditorController } from '../composables';
 *
 * const { state, commands } = useTextEditorController();
 *
 * // In template: :active="state.isBold.value" @click="commands.toggleBold"
 * </script>
 * ```
 */
export function useTextEditorController(): TextEditorController {
  // Computed state that reacts to editor changes
  const state: TextEditorState = {
    hasEditor: computed(() => activeEditor.value !== null),

    isBold: computed(() => {
      // Access updateCounter to ensure reactivity on selection changes
      void updateCounter.value;
      return activeEditor.value?.isActive("bold") ?? false;
    }),

    isItalic: computed(() => {
      void updateCounter.value;
      return activeEditor.value?.isActive("italic") ?? false;
    }),

    isUnderline: computed(() => {
      void updateCounter.value;
      return activeEditor.value?.isActive("underline") ?? false;
    }),

    alignment: computed(() => {
      void updateCounter.value;
      const editor = activeEditor.value;
      if (!editor) return "left";

      if (editor.isActive({ textAlign: "center" })) return "center";
      if (editor.isActive({ textAlign: "right" })) return "right";
      if (editor.isActive({ textAlign: "justify" })) return "justify";
      return "left";
    }),

    color: computed(() => {
      void updateCounter.value;
      const editor = activeEditor.value;
      if (!editor) return null;

      // Get color from current text style attributes
      const attrs = editor.getAttributes("textStyle");
      const color = (attrs.color as string) ?? null;
      return color ? normalizeColor(color) : null;
    }),
  };

  const commands: TextEditorCommands = {
    toggleBold() {
      const editor = activeEditor.value;
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const updateAllText = from === to;

      let cmd = editor.chain().focus();

      if (updateAllText) {
        cmd = cmd.selectAll();
      }

      cmd = cmd.toggleBold();

      if (updateAllText) {
        cmd = cmd.setTextSelection(to);
      }

      cmd.run();
    },

    toggleItalic() {
      const editor = activeEditor.value;
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const updateAllText = from === to;

      let cmd = editor.chain().focus();

      if (updateAllText) {
        cmd = cmd.selectAll();
      }

      cmd = cmd.toggleItalic();

      if (updateAllText) {
        cmd = cmd.setTextSelection(to);
      }

      cmd.run();
    },

    toggleUnderline() {
      const editor = activeEditor.value;
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const updateAllText = from === to;

      let cmd = editor.chain().focus();

      if (updateAllText) {
        cmd = cmd.selectAll();
      }

      cmd = cmd.toggleUnderline();

      if (updateAllText) {
        cmd = cmd.setTextSelection(to);
      }

      cmd.run();
    },

    setAlignment(alignment: TextAlignment) {
      const editor = activeEditor.value;
      if (!editor) return;

      // Alignment always applies to all paragraphs
      editor.chain().selectAll().setTextAlign(alignment).run();
    },

    setColor(color: string) {
      const editor = activeEditor.value;
      if (!editor) return;

      const { from, to } = editor.state.selection;

      if (from === to) {
        editor
          .chain()
          .focus()
          .selectAll()
          .setColor(color)
          .setTextSelection(to)
          .run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
    },
  };

  function register(editor: Editor, blockElement: HTMLElement): void {
    activeEditor.value = editor;
    activeBlockElement.value = blockElement;

    // Listen for selection/transaction updates to trigger reactivity
    editor.on("selectionUpdate", () => {
      updateCounter.value++;
    });
    editor.on("transaction", () => {
      updateCounter.value++;
    });
  }

  function unregister(): void {
    activeEditor.value = null;
    activeBlockElement.value = null;
  }

  return {
    editor: activeEditor,
    blockElement: activeBlockElement,
    state,
    commands,
    register,
    unregister,
  };
}

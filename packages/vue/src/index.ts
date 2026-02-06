export { default as InfiniteCanvas } from "./components/InfiniteCanvas.vue";
export type { InfiniteCanvasProps } from "./components/InfiniteCanvas.vue";

// Background Components
export { default as CanvasBackground } from "./components/CanvasBackground.vue";

// Floating Menu Components
export { default as FloatingMenu } from "./components/FloatingMenu.vue";
export { default as FloatingMenuBar } from "./components/FloatingMenuBar.vue";

// Toolbar Components
export { default as Toolbar } from "./components/Toolbar.vue";
export { default as ToolbarButton } from "./components/ToolbarButton.vue";
export { default as SelectTool } from "./components/tools/SelectTool.vue";
export { default as HandTool } from "./components/tools/HandTool.vue";
export { default as StickyNoteTool } from "./components/tools/StickyNoteTool.vue";
export { default as TextTool } from "./components/tools/TextTool.vue";
export { default as EraserTool } from "./components/tools/EraserTool.vue";
export { default as PenTool } from "./components/tools/PenTool.vue";
export { default as ArcArrowTool } from "./components/tools/ArcArrowTool.vue";
export { default as ElbowArrowTool } from "./components/tools/ElbowArrowTool.vue";
export { default as ImageTool } from "./components/tools/ImageTool.vue";
export { default as Eraser } from "./components/blocks/Eraser.vue";
export { default as PenStroke } from "./components/blocks/PenStroke.vue";
export { default as TextBlock } from "./components/blocks/TextBlock.vue";

// Arrow Components
export { default as ArcArrow } from "./components/blocks/ArcArrow.vue";
export { default as ElbowArrow } from "./components/blocks/ElbowArrow.vue";
export { default as ArrowHead } from "./components/blocks/ArrowHead.vue";
export { default as ArrowHandle } from "./components/blocks/ArrowHandle.vue";
export { default as ArrowTerminal } from "./components/blocks/ArrowTerminal.vue";

// Image Components
export { default as ImageBlock } from "./components/blocks/ImageBlock.vue";

// Text Components
export { default as EditableText } from "./components/EditableText.vue";

// User Presence
export { default as UserPresence } from "./components/UserPresence.vue";
export { User } from "@infinitecanvas/editor";

// Menu Button Components
export { default as MenuDropdown } from "./components/buttons/MenuDropdown.vue";
export { default as MenuButton } from "./components/buttons/MenuButton.vue";
export { default as MenuTooltip } from "./components/buttons/MenuTooltip.vue";
export { default as ColorButton } from "./components/buttons/ColorButton.vue";
export { default as ColorPicker } from "./components/buttons/ColorPicker.vue";
export { default as ArrowThicknessButton } from "./components/buttons/ArrowThicknessButton.vue";

// Text Formatting Button Components
export {
  TextBoldButton,
  TextItalicButton,
  TextUnderlineButton,
  TextAlignmentButton,
  TextFontSizeButton,
  TextFontFamilyButton,
  TextColorButton,
  type FontOption,
} from "./components/buttons/text";

// Composables
export { useQuery, type QueryResultItem } from "./composables/useQuery";
export { useComponent } from "./composables/useComponent";
export { useComponents } from "./composables/useComponents";
export { useSingleton } from "./composables/useSingleton";
export {
  useTooltipSingleton,
  createTooltipContext,
} from "./composables/useTooltipSingleton";
export { useToolbar } from "./composables/useToolbar";
export {
  useEditorContext,
  type EditorContext,
} from "./composables/useEditorContext";
export {
  useTextStretchBehavior,
  type TextStretchBehaviorOptions,
  type TextStretchBehaviorResult,
} from "./composables/useTextStretchBehavior";
export {
  useTextEditorController,
  type TextEditorController,
  type TextEditorState,
  type TextEditorCommands,
} from "./composables/useTextEditorController";
export { TextAlignment } from "@infinitecanvas/editor";
export {
  useTextBatchController,
  type TextBatchController,
  type TextBatchState,
  type TextBatchCommands,
} from "./composables/useTextBatchController";
export {
  useTextFormatting,
  type TextFormattingController,
  type TextFormattingState,
  type TextFormattingCommands,
} from "./composables/useTextFormatting";
export { useFonts } from "./composables/useFonts";

// Utilities
export { computeCommonComponents } from "./utils/computeCommonComponents";

// Cursors
export { CursorKind, CURSORS } from "./cursors";

// ECS Sync
export {
  EditorSync,
  type EditorSyncOptions,
  EditorComponentDef,
  EditorSingletonDef,
  defineEditorComponent,
  defineEditorSingleton,
  Synced,
  type AnyEditorComponentDef,
  type AnyEditorSingletonDef,
  type SyncBehavior,
} from "@infinitecanvas/ecs-sync";

// Types
export type { BlockData, BackgroundOptions } from "./types";

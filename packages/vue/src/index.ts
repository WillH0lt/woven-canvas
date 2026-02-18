export { Shape, StrokeKind, TextAlignment, User } from '@woven-canvas/core'
// ECS Sync
export {
  type AnyCanvasComponentDef,
  type AnyCanvasSingletonDef,
  CanvasComponentDef,
  CanvasSingletonDef,
  CanvasStore,
  type CanvasStoreOptions,
  defineCanvasComponent,
  defineCanvasSingleton,
  type SyncBehavior,
  Synced,
} from '@woven-ecs/canvas-store'
export {
  ARROW_HEADS,
  type ArrowHeadDef,
  getArrowHead,
} from './arrowHeads'
// Arrow Components
export { default as ArcArrow } from './components/blocks/ArcArrow.vue'
export { default as ArrowHandle } from './components/blocks/ArrowHandle.vue'
export { default as ArrowHead } from './components/blocks/ArrowHead.vue'
export { default as ArrowTerminal } from './components/blocks/ArrowTerminal.vue'
export { default as ElbowArrow } from './components/blocks/ElbowArrow.vue'
export { default as Eraser } from './components/blocks/Eraser.vue'
// Image Components
export { default as ImageBlock } from './components/blocks/ImageBlock.vue'
export { default as PenStroke } from './components/blocks/PenStroke.vue'
// Shape Components
export { default as ShapeBlock } from './components/blocks/ShapeBlock.vue'
export { default as TextBlock } from './components/blocks/TextBlock.vue'
export { default as ArrowHeadButton } from './components/buttons/ArrowHeadButton.vue'
export { default as ArrowThicknessButton } from './components/buttons/ArrowThicknessButton.vue'
export { default as ColorButton } from './components/buttons/ColorButton.vue'
export { default as ColorPicker } from './components/buttons/ColorPicker.vue'
export { default as MenuButton } from './components/buttons/MenuButton.vue'
// Menu Button Components
export { default as MenuDropdown } from './components/buttons/MenuDropdown.vue'
export { default as MenuTooltip } from './components/buttons/MenuTooltip.vue'
export { default as ShapeFillColorButton } from './components/buttons/ShapeFillColorButton.vue'
// Shape Menu Button Components
export { default as ShapeKindButton } from './components/buttons/ShapeKindButton.vue'
export { default as ShapeStrokeColorButton } from './components/buttons/ShapeStrokeColorButton.vue'
// Text Formatting Button Components
export {
  type FontOption,
  TextAlignmentButton,
  TextBoldButton,
  TextColorButton,
  TextFontFamilyButton,
  TextFontSizeButton,
  TextItalicButton,
  TextUnderlineButton,
} from './components/buttons/text'
// Background Components
export { default as CanvasBackground } from './components/CanvasBackground.vue'
// Text Components
export { default as EditableText } from './components/EditableText.vue'
// Floating Menu Components
export { default as FloatingMenu } from './components/FloatingMenu.vue'
export { default as FloatingMenuBar } from './components/FloatingMenuBar.vue'
// Toolbar Components
export { default as Toolbar } from './components/Toolbar.vue'
export { default as ToolbarButton } from './components/ToolbarButton.vue'
export { default as ArcArrowTool } from './components/tools/ArcArrowTool.vue'
export { default as ElbowArrowTool } from './components/tools/ElbowArrowTool.vue'
export { default as EraserTool } from './components/tools/EraserTool.vue'
export { default as HandTool } from './components/tools/HandTool.vue'
export { default as ImageTool } from './components/tools/ImageTool.vue'
export { default as PenTool } from './components/tools/PenTool.vue'
export { default as SelectTool } from './components/tools/SelectTool.vue'
export { default as ShapeTool } from './components/tools/ShapeTool.vue'
export { default as StickyNoteTool } from './components/tools/StickyNoteTool.vue'
export { default as TextTool } from './components/tools/TextTool.vue'
// User Presence
export { default as UserPresence } from './components/UserPresence.vue'
export type { WovenCanvasProps } from './components/WovenCanvas.vue'
export { default as WovenCanvas } from './components/WovenCanvas.vue'
export { useComponent } from './composables/useComponent'
export { useComponents } from './composables/useComponents'
export {
  type EditorContext,
  useEditorContext,
} from './composables/useEditorContext'
export { useFonts } from './composables/useFonts'
// Composables
export { type QueryResultItem, useQuery } from './composables/useQuery'
export { useSingleton } from './composables/useSingleton'
export {
  type TextBatchCommands,
  type TextBatchController,
  type TextBatchState,
  useTextBatchController,
} from './composables/useTextBatchController'
export {
  type TextEditorCommands,
  type TextEditorController,
  type TextEditorState,
  useTextEditorController,
} from './composables/useTextEditorController'
export {
  type TextFormattingCommands,
  type TextFormattingController,
  type TextFormattingState,
  useTextFormatting,
} from './composables/useTextFormatting'
export {
  type TextStretchBehaviorOptions,
  type TextStretchBehaviorResult,
  useTextStretchBehavior,
} from './composables/useTextStretchBehavior'
export { useToolbar } from './composables/useToolbar'
export {
  createTooltipContext,
  useTooltipSingleton,
} from './composables/useTooltipSingleton'
export { CURSORS, CursorKind } from './cursors'
// Editing Plugin
export { EditingPlugin, type EditingPluginOptions, type EditingPluginResources } from './EditingPlugin'
export { SHAPES } from './shapes'
// Types
export type { BackgroundOptions, BlockData } from './types'
// Utilities
export { computeCommonComponents } from './utils/computeCommonComponents'

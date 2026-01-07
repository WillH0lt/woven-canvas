export { default as InfiniteCanvas } from "./components/InfiniteCanvas.vue";
export type {
  InfiniteCanvasProps,
  ControlsOptions,
} from "./components/InfiniteCanvas.vue";

// Floating Menu Components
export {
  default as FloatingMenu,
} from "./components/FloatingMenu.vue";
export { default as FloatingMenuBar } from "./components/FloatingMenuBar.vue";

// Menu Button Components
export { default as MenuDropdown } from "./components/buttons/MenuDropdown.vue";
export { default as MenuButton } from "./components/buttons/MenuButton.vue";
export { default as MenuTooltip } from "./components/buttons/MenuTooltip.vue";
export { default as ColorButton } from "./components/buttons/ColorButton.vue";
export { default as ColorPicker } from "./components/buttons/ColorPicker.vue";

// Composables
export { useQuery, type QueryResultItem } from "./composables/useQuery";
export { useComponent } from "./composables/useComponent";
export { useComponents } from "./composables/useComponents";
export { useSingleton } from "./composables/useSingleton";
export { useTooltipSingleton } from "./composables/useTooltipSingleton";
export {
  useEditorContext,
  type EditorContext,
} from "./composables/useEditorContext";

// Utilities
export { computeCommonComponents } from "./utils/computeCommonComponents";

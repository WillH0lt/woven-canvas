export { default as InfiniteCanvas } from "./components/InfiniteCanvas.vue";
export type {
  InfiniteCanvasProps,
  ControlsOptions,
} from "./components/InfiniteCanvas.vue";

// Default selection UI components (can be overridden via slots)
export { default as SelectionBox } from "./components/SelectionBox.vue";
export { default as TransformBox } from "./components/TransformBox.vue";
export { default as TransformHandle } from "./components/TransformHandle.vue";

// Composables
export { useQuery, type QueryResultItem } from "./composables/useQuery";
export { useComponent } from "./composables/useComponent";
export { useSingleton } from "./composables/useSingleton";

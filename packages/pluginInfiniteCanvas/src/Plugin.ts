import type { EditorPlugin } from "@infinitecanvas/editor";

// Components
import {
  Block,
  Aabb,
  Selected,
  Hovered,
  Edited,
  Persistent,
  Locked,
  DragStart,
  TransformBox,
  TransformHandle,
  SelectionBox,
  ScaleWithZoom,
  Opacity,
  Text,
  Connector,
} from "./components";

// Singletons
import {
  SelectionStateSingleton,
  TransformBoxStateSingleton,
  Intersect,
  RankBounds,
  Cursor,
} from "./singletons";

/**
 * Infinite Canvas Plugin
 *
 * Provides core infinite canvas functionality:
 * - Block management (create, select, move, resize, rotate)
 * - Selection (single, multi-select, marquee selection)
 * - Transform box (scale, stretch, rotate handles)
 * - Z-ordering (bring forward, send backward)
 * - Connectors (lines/arrows between blocks)
 */
export const InfiniteCanvasPlugin: EditorPlugin = {
  name: "infiniteCanvas",

  dependencies: ["core"],

  components: [
    Block,
    Aabb,
    Selected,
    Hovered,
    Edited,
    Persistent,
    Locked,
    DragStart,
    TransformBox,
    TransformHandle,
    SelectionBox,
    ScaleWithZoom,
    Opacity,
    Text,
    Connector,
  ],

  singletons: [
    SelectionStateSingleton,
    TransformBoxStateSingleton,
    Intersect,
    RankBounds,
    Cursor,
  ],

  captureSystems: [
    // TODO: Add systems in later steps
    // intersectSystem,
    // selectCaptureSystem,
    // transformBoxCaptureSystem,
  ],

  updateSystems: [
    // TODO: Add systems in later steps
    // blockUpdateSystem,
    // selectionUpdateSystem,
    // transformBoxUpdateSystem,
    // dragHandlerSystem,
  ],

  setup(ctx) {
    // Initialize rank bounds
    RankBounds.initialize(ctx);
  },
};

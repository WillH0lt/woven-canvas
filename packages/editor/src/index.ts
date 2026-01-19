// Re-export math types
export type { Vec2 } from "@infinitecanvas/math";

// types
export type {
  EditorResources,
  SyncBehavior,
  EditorComponentMeta,
  EditorOptionsInput,
  KeybindInput,
  CursorDefMap,
  ResizeMode,
  BlockDefInput,
} from "./types";

export {
  getPluginResources,
  Keybind,
  CursorDef,
  VerticalAlignment,
  TextAlignment,
  BlockDef,
} from "./types";

// Font loading
export { FontLoader, FontFamily, type FontFamilyInput } from "./FontLoader";
export type { FontFamily as FontFamilyType } from "./FontLoader";

// Singleton base class
export {
  EditorSingletonDef,
  defineEditorSingleton,
  type EditorSingletonOptions,
  type AnyEditorSingletonDef,
} from "./EditorSingletonDef";

// State machine singleton
export {
  EditorStateDef,
  defineEditorState,
  type StateSchema,
  type InferStateContext,
} from "./EditorStateDef";

// Component base classes
export {
  EditorComponentDef,
  defineEditorComponent,
  type EditorComponentOptions,
  type AnyEditorComponentDef,
} from "./EditorComponentDef";

// Store adapter
export type { StoreAdapter } from "./store";

// Plugin system
export {
  type EditorPlugin,
  type EditorPluginFactory,
  type EditorPluginInput,
  parsePlugin,
} from "./plugin";

// Editor system
export {
  defineEditorSystem,
  type EditorSystem,
  type EditorSystemOptions,
  type EditorSystemFunction,
} from "./EditorSystem";

// Command system
export {
  defineCommand,
  on,
  type CommandDef,
  CommandMarker,
  Undo,
  Redo,
} from "./command";

// Editor class
export { Editor, type QueryCallback } from "./Editor";

// Re-export useful ECS utilities
export {
  field,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  defineQuery,
  getResources,
  defineSystem,
  getBackrefs,
  MainThreadSystem,
  EventType,
  SINGLETON_ENTITY_ID,
  ComponentDef,
  isAlive,
  type Context,
  type EntityId,
  type QueryDef,
  type System,
  type InferComponentType,
  type ComponentSchema,
} from "@infinitecanvas/ecs";

// Plugin
export { CorePlugin } from "./CorePlugin";

// Singletons
export {
  Camera,
  Controls,
  Frame,
  Keyboard,
  Key,
  Mouse,
  Screen,
  Cursor,
  Intersect,
  RankBounds,
  ScaleWithZoomState,
} from "./singletons";

// Components
export {
  Pointer,
  PointerButton,
  PointerType,
  Synced,
  Block,
  Aabb,
  Hovered,
  Edited,
  ScaleWithZoom,
  Opacity,
  Text,
  Connector,
  Color,
  VerticalAlign,
  User,
  HitGeometry,
  MAX_HIT_CAPSULES,
  MAX_HIT_ARCS,
} from "./components";

// Events
export {
  // Types
  type PointerInput,
  type PointerInputType,
  type PointerInputOptions,
  type MouseInput,
  type MouseInputType,
  type FrameInput,
  type KeyboardInput,
  type KeyboardInputType,
  getPointerInput,
  clearPointerTrackingState,
  getMouseInput,
  getFrameInput,
  getKeyboardInput,
} from "./events";

// State machine utilities
export { runMachine, type MachineResult } from "./machine";

// Helpers
export {
  intersectPoint,
  intersectAabb,
  intersectCapsule,
  getTopmostBlockAtPoint,
  canBlockEdit,
  getBlockDef,
} from "./helpers";

// Systems
export { rankBoundsSystem } from "./systems/preInput";
export { intersectSystem } from "./systems/preCapture";
export { undoRedoSystem, removeEmptyTextSystem } from "./systems/update";
export { scaleWithZoomSystem } from "./systems/preRender";

// Re-export math types
export type { Vec2 } from "@infinitecanvas/math";

// types
export type {
  EditorResources,
  EditorOptionsInput,
  KeybindInput,
  CursorDefMap,
  ResizeMode,
  BlockDefInput,
  UserDataInput,
  GridOptionsInput,
} from "./types";

export {
  getPluginResources,
  Keybind,
  CursorDef,
  VerticalAlignment,
  TextAlignment,
  BlockDef,
  Stratum,
  UserData,
  GridOptions,
} from "./types";

// Font loading
export { FontLoader, FontFamily, type FontFamilyInput } from "./FontLoader";
export type { FontFamily as FontFamilyType } from "./FontLoader";

// Re-export from ecs-sync
export {
  CanvasSingletonDef,
  defineCanvasSingleton,
} from "@woven-ecs/canvas-store";

export type {
  AnyCanvasSingletonDef,
  SingletonEditorBehavior,
  AnyCanvasComponentDef,
  SyncBehavior,
  InferEditorComponentType,
} from "@woven-ecs/canvas-store";

export {
  CanvasComponentDef,
  defineCanvasComponent,
  Synced,
} from "@woven-ecs/canvas-store";

// State machine singleton
export {
  EditorStateDef,
  defineEditorState,
  type StateSchema,
  type InferStateContext,
} from "./EditorStateDef";

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
  type ComponentSchema,
} from "@woven-ecs/core";

// Plugin
export { CorePlugin } from "./CorePlugin";

// Constants
export { STRATUM_ORDER } from "./constants";

// Singletons
export {
  Camera,
  Controls,
  Frame,
  Grid,
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
  Block,
  Aabb,
  Hovered,
  Edited,
  Held,
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
  Image,
  Asset,
  UploadState,
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
  isHeldByRemote,
} from "./helpers";

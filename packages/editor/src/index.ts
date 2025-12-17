// Re-export math types
export type { Vec2 } from "@infinitecanvas/math";

// Core types
export type {
  EditorResources,
  SyncBehavior,
  EditorComponentMeta,
} from "./types";
export { getPluginResources } from "./types";

// Singleton base class
export {
  EditorSingletonDef,
  defineEditorSingleton,
  type EditorSingletonOptions,
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
} from "./EditorComponentDef";

// Store adapter
export type {
  StoreAdapter,
  DocumentSnapshot,
  EntitySnapshot,
  DocumentChange,
} from "./store";

// Plugin system
export { type EditorPlugin } from "./plugin";

// Command system
export { defineCommand, type CommandDef } from "./command";

// Editor class
export { Editor, type EditorOptions, type QueryCallback } from "./Editor";

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
  type Context,
  type EntityId,
  type QueryDef,
  type System,
  type InferComponentType,
} from "@infinitecanvas/ecs";

// Plugin
export { CorePlugin } from "./CorePlugin";

// Components
export {
  Camera,
  Controls,
  Frame,
  Keyboard,
  Key,
  Mouse,
  Screen,
  Pointer,
  PointerButton,
  PointerType,
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

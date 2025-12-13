// Re-export field builders from ECS for convenience
export { field } from "@infinitecanvas/ecs";

// Core types
export type {
  EditorResources,
  SyncBehavior,
  EditorComponentMeta,
  SystemFn,
} from "./types";

// Singleton base class
export {
  EditorSingletonDef,
  defineEditorSingleton,
  type EditorSingletonOptions,
} from "./EditorSingletonDef";

// Component base classes
export {
  EditorComponentDef,
  defineEditorComponent,
  type EditorComponentOptions,
} from "./EditorComponentDef";

// Store adapter
export type {
  StoreAdapter,
  DocumentChange,
  PresenceChange,
  LocalChange,
  DocumentSnapshot,
  EntitySnapshot,
} from "./store";

// Plugin system
export { type EditorPlugin } from "./plugin";

// Command system
export { defineCommand, type CommandDef } from "./command";

// System definition
export { defineEditorSystem } from "./System";

// Editor class
export { Editor, type EditorOptions, type QueryCallback } from "./Editor";

// Re-export useful ECS utilities
export {
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
} from "@infinitecanvas/ecs";

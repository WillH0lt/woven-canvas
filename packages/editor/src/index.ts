// Re-export field builders from ECS for convenience
export { field } from "@infinitecanvas/ecs";

// Core types
export type {
  SyncBehavior,
  DataCategory,
  EditorComponentMeta,
  SystemFn,
  EditorContext,
  EditorInstance,
  EntityId,
} from "./types";

// Singleton base class and factory
export {
  EditorSingletonDef,
  defineSingleton,
  type EditorSingletonOptions,
} from "./EditorSingletonDef";

// Re-export Any* type aliases for backwards compatibility
export type { AnyEditorSingletonDef } from "./EditorSingletonDef";

// Component base classes and factories
export {
  EditorComponentDef,
  BlockDef,
  MetaDef,
  defineBlock,
  defineMeta,
  type EditorComponentOptions,
} from "./EditorComponentDef";
export type { AnyEditorComponentDef, AnyBlockDef, AnyMetaDef } from "./EditorComponentDef";

// System phases
export {
  type SystemPhase,
  type PhaseSystem,
  PHASE_ORDER,
  defineInputSystem,
  defineCaptureSystem,
  defineUpdateSystem,
  defineRenderSystem,
} from "./phase";

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
  type QueryDef,
} from "@infinitecanvas/ecs";

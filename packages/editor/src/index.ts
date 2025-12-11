// Re-export field builders from ECS for convenience
export { field } from "@infinitecanvas/ecs";

// Core types
export type {
  SyncBehavior,
  DataCategory,
  EditorComponentMeta,
  EditorComponentDef,
  EditorSingletonDef,
  SystemFn,
  EditorContext,
  EditorInstance,
  EntityId,
} from "./types";

// Component definition helpers
export { defineBlock, type BlockOptions } from "./defineBlock";
export { defineMeta, type MetaOptions } from "./defineMeta";
export { defineSingleton, type SingletonOptions } from "./defineSingleton";

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

// Command architecture
export {
  type CommandHandler,
  type CommandListener,
  type CommandRegistry,
} from "./command";

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

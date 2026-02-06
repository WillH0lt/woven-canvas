// Core types
export type {
  SyncBehavior,
  VersionMismatchResponse,
  InferEditorComponentType,
} from "./types";
export {
  type ComponentMigration,
  type MigrationResult,
  migrateComponentData,
  validateMigrations,
} from "./migrations";

// Synced component
export { Synced } from "./components/Synced";

// Component definitions
export {
  EditorComponentDef,
  type AnyEditorComponentDef,
  defineEditorComponent,
} from "./EditorComponentDef";

// Singleton definitions
export {
  EditorSingletonDef,
  type AnyEditorSingletonDef,
  type SingletonEditorBehavior,
  defineEditorSingleton,
} from "./EditorSingletonDef";

export {
  EditorSync,
  type EditorSyncOptions,
  type EditorSyncInitOptions,
} from "./EditorSync";

export {
  WebsocketAdapter,
  type WebsocketAdapterOptions,
} from "./adapters/Websocket";

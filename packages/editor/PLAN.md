# Editor Framework Library Plan

## Goal

Create a **framework-agnostic editor library** (`@infinitecanvas/editor`) that wraps `@infinitecanvas/ecs` with:

- Built-in data structure types (Block, Meta, Singleton, Connector)
- Built-in system phases (Input → Capture → Update → Render)
- Command architecture for complex operations
- Plugin system for extensibility
- Store adapter interface for persistence/sync

This is a pure TypeScript library that applications (Vue, React, etc.) can use to build editors.

---

## Part 1: Bare Editor (Implement Now)

### 1.1 Data Structure Types

Four fundamental component categories, each with persistence/sync metadata:

```typescript
// src/types.ts

/**
 * Sync determines how component changes propagate
 */
export type SyncBehavior =
  | "document" // Persisted to database, synced to all clients
  | "presence" // Synced via websocket for presence (cursors, selections)
  | "local" // Cached in local storage only (session data, camera position)
  | "none"; // Not synced or stored anywhere

/**
 * Data structure category
 */
export type DataCategory = "block" | "meta" | "singleton";
```

### 1.2 Enhanced Component Definitions

```typescript
// src/defineBlock.ts
import { defineComponent as ecsDefineComponent } from "@infinitecanvas/ecs";

export interface BlockOptions {
  sync?: SyncBehavior; // default: 'document'
}

/**
 * Define a Block component - primary entity data (position, size, content)
 * Blocks are always persisted as document data.
 */
export function defineBlock<T>(schema: T, options: BlockOptions = {}) {
  const def = ecsDefineComponent(schema);
  return Object.assign(def, {
    __editor: {
      category: "block" as const,
      sync: options.sync ?? "document",
    },
  });
}

// src/defineMeta.ts
export interface MetaOptions {
  sync?: SyncBehavior; // default: 'document'
}

/**
 * Define a Meta component - block metadata (effects, constraints, styles)
 * Meta components are persisted alongside their block.
 */
export function defineMeta<T>(schema: T, options: MetaOptions = {}) {
  const def = ecsDefineComponent(schema);
  return Object.assign(def, {
    __editor: {
      category: "meta" as const,
      sync: options.sync ?? "document",
    },
  });
}

// src/defineSingleton.ts
import { defineSingleton as ecsDefineSingleton } from "@infinitecanvas/ecs";

export interface SingletonOptions {
  sync?: SyncBehavior; // default: 'none'
}

/**
 * Define a Singleton - global state (camera, grid config, tool state)
 */
export function defineSingleton<T>(schema: T, options: SingletonOptions = {}) {
  const def = ecsDefineSingleton(schema);
  return Object.assign(def, {
    __editor: {
      category: "singleton" as const,
      sync: options.sync ?? "ephemeral",
    },
  });
}
```

### 1.3 System Phases (Built-in)

```typescript
// src/phase.ts
export type SystemPhase = "input" | "capture" | "update" | "render";

export interface PhaseSystem {
  phase: SystemPhase;
  name: string;
  execute: (ctx: EditorContext) => void;
}

export function defineInputSystem(name: string, execute: SystemFn): PhaseSystem;
export function defineCaptureSystem(
  name: string,
  execute: SystemFn
): PhaseSystem;
export function defineUpdateSystem(
  name: string,
  execute: SystemFn
): PhaseSystem;
export function defineRenderSystem(
  name: string,
  execute: SystemFn
): PhaseSystem;
```

**Phase Responsibilities:**

| Phase       | Purpose                                 | Examples                             |
| ----------- | --------------------------------------- | ------------------------------------ |
| **Input**   | Convert raw events to ECS state         | Pointer position, keyboard modifiers |
| **Capture** | Detect targets, compute intersections   | Hover detection, click targets       |
| **Update**  | Modify document state, process commands | Move blocks, change properties       |
| **Render**  | Sync ECS state to output                | Update DOM, emit events for UI       |

### 1.4 Command Architecture

```typescript
// src/command.ts

export interface CommandHandler<T = unknown> {
  type: string;
  execute: (ctx: EditorContext, payload: T) => void;
}

export interface CommandRegistry {
  register<T>(handler: CommandHandler<T>): void;
  emit<T>(type: string, payload: T): void;
  subscribe(listener: (type: string, payload: unknown) => void): () => void;
}
```

### 1.5 Store Adapter Interface

```typescript
// src/store.ts

export interface StoreAdapter {
  /**
   * Called when document data changes (blocks, meta, connectors with sync='document')
   */
  onDocumentChange?: (changes: DocumentChange[]) => void;

  /**
   * Called when presence data changes (components with sync='presence')
   */
  onPresenceChange?: (changes: PresenceChange[]) => void;

  /**
   * Called when local data changes (components with sync='local')
   */
  onLocalChange?: (changes: LocalChange[]) => void;

  /**
   * Load initial document state
   */
  load?: () => Promise<DocumentSnapshot>;

  /**
   * Create a checkpoint for undo/redo
   */
  checkpoint?: () => void;

  /**
   * Undo to previous checkpoint
   */
  undo?: () => void;

  /**
   * Redo to next checkpoint
   */
  redo?: () => void;
}

export interface DocumentChange {
  entityId: number;
  componentDef: ComponentDef;
  type: "added" | "changed" | "removed";
  data?: unknown;
}
```

### 1.6 Plugin Interface

```typescript
// src/plugin.ts

export interface EditorPlugin {
  name: string;
  dependencies?: string[];

  components?: EditorComponentDef[];
  singletons?: EditorSingletonDef[];
  systems?: PhaseSystem[];
  commands?: CommandHandler[];

  setup?: (editor: Editor) => void | Promise<void>;
  teardown?: (editor: Editor) => void | Promise<void>;
}
```

### 1.7 Editor Class

```typescript
// src/Editor.ts

export interface EditorOptions {
  plugins?: EditorPlugin[];
  store?: StoreAdapter;
  maxEntities?: number;
  resources?: unknown;
}

export class Editor {
  private world: World;
  private phases: Map<SystemPhase, PhaseSystem[]>;
  private commands: CommandRegistry;
  private plugins: Map<string, EditorPlugin>;
  private store: StoreAdapter | null;

  constructor(options: EditorOptions = {});

  /** Run one frame */
  tick(): void;

  /** Emit a command */
  emit<T>(type: string, payload: T): void;

  /** Schedule work for next tick */
  nextTick(callback: (ctx: EditorContext) => void): void;

  /** Subscribe to query changes */
  subscribe(query: QueryDef, callback: QueryCallback): () => void;

  /** Get raw ECS context */
  getContext(): EditorContext;

  /** Clean up */
  dispose(): void;
}
```

---

## Directory Structure (Bare Editor)

```
packages/editor/src/
├── index.ts                 # Public API exports
├── Editor.ts                # Main Editor class
├── defineBlock.ts           # Block component wrapper
├── defineMeta.ts            # Meta component wrapper
├── defineConnector.ts       # Connector component wrapper
├── defineSingleton.ts       # Singleton wrapper
├── phase.ts                 # System phase definitions
├── command.ts               # Command registry
├── store.ts                 # Store adapter interface
├── plugin.ts                # Plugin interface
├── context.ts               # EditorContext type
├── types.ts                 # Shared types
└── __tests__/
    └── Editor.test.ts
```

---

## Implementation Order (Bare Editor)

1. `types.ts` - SyncBehavior, DataCategory, shared types
2. `defineBlock.ts` - Block component wrapper
3. `defineMeta.ts` - Meta component wrapper
4. `defineConnector.ts` - Connector component wrapper
5. `defineSingleton.ts` - Singleton wrapper
6. `phase.ts` - System phases and helpers
7. `command.ts` - Command registry
8. `store.ts` - Store adapter interface
9. `plugin.ts` - Plugin interface
10. `context.ts` - EditorContext
11. `Editor.ts` - Main class
12. `index.ts` - Exports

---

## Part 2: Future Plugins (Roadmap)

### Input Plugin

- Pointer/mouse/touch input handling
- Keyboard state tracking
- Input event normalization
- Multi-touch support

### InfiniteCanvas Plugin

- Block component with spatial data
- Camera/viewport management
- Selection logic (click, drag-select, shift-click)
- Transform operations (move, rotate, scale)
- Text editing integration
- Z-ordering (rank)

### StateMachine Plugin

- XState integration
- `runMachine()` helper like core
- State persistence across frames
- Guard/action helpers

### History Plugin

- Undo/redo stack management
- Checkpoint creation
- Works with store adapter

---

## Part 3: Future Store Adapters (Roadmap)

### Loro CRDT Adapter

- Local-first with Loro
- Real-time multiplayer sync
- Offline support
- Conflict resolution

### Simple Persistence Adapter

- IndexedDB for local storage
- REST API for server sync
- Basic checkpoint/undo

### Presence Adapter

- WebSocket presence channel
- Cursor positions
- Selection sharing
- "Who's viewing" indicator

---

## Design Decisions

1. **Data categories are built-in** - Block, Meta, Singleton are fundamental to any editor

2. **Phases are built-in** - Input → Capture → Update → Render provides consistent execution order for plugins

3. **Store is optional** - Editor works without a store (ephemeral mode), adapters add persistence

4. **Commands are the mutation API** - All document changes should go through commands for consistency

5. **Plugins extend, don't replace** - Core provides structure, plugins add behavior

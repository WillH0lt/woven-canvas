# Infinite Canvas Plugin Implementation Plan

## Overview

Port the core infinite canvas functionality from `@infinitecanvas/core` to the new ECS plugin architecture in `@infinitecanvas/editor`. This plugin provides the fundamental building blocks for selection, transformation, and block manipulation.

## Systems to Port

The following systems from core need to be ported:

| Core System           | Purpose                                                               | New Phase |
| --------------------- | --------------------------------------------------------------------- | --------- |
| `PreCaptureIntersect` | Computes AABB, detects mouse-block intersections, manages hover state | `capture` |
| `PreCaptureSelect`    | Selection state machine - handles pointing, dragging, selection box   | `capture` |
| `CaptureTransformBox` | Transform box state machine - manages transform box lifecycle         | `capture` |
| `UpdateBlocks`        | Block CRUD operations, clipboard, selection commands, cursor          | `update`  |
| `UpdateSelection`     | Selection box entity management and intersection queries              | `update`  |
| `UpdateTransformBox`  | Transform box and handle creation/updates                             | `update`  |
| `UpdateDragHandler`   | Drag operations - move, rotate, scale, stretch                        | `update`  |

## Architecture Changes

### Old Architecture (Becsy ECS)

- Class-based systems extending `BaseSystem`
- Queries defined as class properties with `this.query()`
- Singletons accessed via `this.singleton.read/write()`
- Commands via `emitCommand()` / `addCommandListener()`
- State machines run via `this.runMachine()`

### New Architecture (@infinitecanvas/ecs)

- Functional systems via `defineSystem()`
- Queries defined with `defineQuery()`
- Singletons via `MySingleton.read(ctx)` / `MySingleton.write(ctx)`
- Commands via `defineCommand()` with `spawn()` / `iter()`
- State machines run via `runMachine()` from `machine.ts`
- Plugin structure with `EditorPlugin` interface

## Implementation Plan

### Step 1: Define Components and Singletons

Create new component/singleton definitions using `defineEditorComponent()` and `EditorSingletonDef`:

```
src/plugins/infiniteCanvas/components/
  Block.ts           - Core block component (position, size, rotation, rank, tag)
  Aabb.ts            - Axis-aligned bounding box for intersection
  Selected.ts        - Selection marker with selectedBy field
  Hovered.ts         - Hover state marker
  Persistent.ts      - Marks blocks that persist to storage
  Locked.ts          - Prevents editing/moving
  DragStart.ts       - Stores initial transform for drag operations
  TransformBox.ts    - Transform box wrapper around selection
  TransformHandle.ts - Scale/rotate/stretch handles
  SelectionBox.ts    - Marquee selection rectangle
  Connector.ts       - Arrow/line connectors between blocks
  Text.ts            - Text content component
  Edited.ts          - Marks blocks being edited
```

Singletons:

```
  SelectionState.ts    - Selection state machine context
  TransformBoxState.ts - Transform box state machine context
  Intersect.ts         - Current mouse-block intersection results
  RankBounds.ts        - LexoRank bounds for z-ordering
  Cursor.ts            - Current cursor state
```

### Step 2: Define Commands

Port commands from `CoreCommand` enum to typed command definitions:

```typescript
// Selection commands
const SelectBlock = defineCommand<{
  entityId: number;
  deselectOthers?: boolean;
}>("select-block");
const DeselectBlock = defineCommand<{ entityId: number }>("deselect-block");
const ToggleSelect = defineCommand<{ entityId: number }>("toggle-select");
const DeselectAll = defineCommand<void>("deselect-all");
const SelectAll = defineCommand<void>("select-all");

// Block manipulation
const DragBlock = defineCommand<{
  entityId: number;
  left: number;
  top: number;
}>("drag-block");
const RemoveBlock = defineCommand<{ entityId: number }>("remove-block");
const RemoveSelected = defineCommand<void>("remove-selected");
const DuplicateSelected = defineCommand<void>("duplicate-selected");
const BringForwardSelected = defineCommand<void>("bring-forward-selected");
const SendBackwardSelected = defineCommand<void>("send-backward-selected");

// Clipboard
const Cut = defineCommand<void>("cut");
const Copy = defineCommand<void>("copy");
const Paste = defineCommand<void>("paste");

// Transform box
const AddOrUpdateTransformBox = defineCommand<void>(
  "add-or-update-transform-box"
);
const UpdateTransformBox = defineCommand<void>("update-transform-box");
const HideTransformBox = defineCommand<void>("hide-transform-box");
const ShowTransformBox = defineCommand<void>("show-transform-box");
const RemoveTransformBox = defineCommand<void>("remove-transform-box");
const StartTransformBoxEdit = defineCommand<void>("start-transform-box-edit");
const EndTransformBoxEdit = defineCommand<void>("end-transform-box-edit");

// Selection box
const AddSelectionBox = defineCommand<void>("add-selection-box");
const UpdateSelectionBox = defineCommand<{
  bounds: Bounds;
  deselectOthers?: boolean;
}>("update-selection-box");
const RemoveSelectionBox = defineCommand<void>("remove-selection-box");

// Cursor
const SetCursor = defineCommand<{ svg?: string; contextSvg?: string }>(
  "set-cursor"
);
const SetControls = defineCommand<Partial<Controls>>("set-controls");

// Clone operations
const CloneEntities = defineCommand<{
  entityIds: number[];
  offset: Vec2;
  seed: string;
}>("clone-entities");
const UncloneEntities = defineCommand<{ entityIds: number[]; seed: string }>(
  "unclone-entities"
);
```

### Step 3: Port Helper Functions

Create utility modules:

```
src/plugins/infiniteCanvas/helpers/
  aabb.ts         - computeAabb(), fastIntersectAabb()
  intersect.ts    - intersectPoint() for hit testing
  transform.ts    - rotation matrices, point transforms
  lexorank.ts     - LexoRank utilities for z-ordering
```

### Step 4: Port State Machines

The selection and transform box systems use XState machines. These can be reused largely as-is, but actions need to emit commands differently:

```
src/plugins/infiniteCanvas/machines/
  selectionMachine.ts    - From PreCaptureSelect
  transformBoxMachine.ts - From CaptureTransformBox
```

Key change: Actions should use command spawning instead of `emitCommand()`:

```typescript
actions: {
  selectIntersect: ({ event }) => {
    // Instead of: this.emitCommand(CoreCommand.SelectBlock, ...)
    // Do: SelectBlock.spawn(ctx, { entityId: ..., deselectOthers: true })
  };
}
```

### Step 5: Implement Systems

#### Capture Phase Systems

**intersectSystem** (from PreCaptureIntersect):

- Updates AABB on block changes
- Computes mouse-block intersections on mouse move
- Updates Intersect singleton
- Manages hover state

**selectCaptureSystem** (from PreCaptureSelect):

- Runs selection state machine
- Handles pointer events for selection
- Manages drag initiation and threshold detection
- Emits selection-related commands

**transformBoxCaptureSystem** (from CaptureTransformBox):

- Runs transform box state machine
- Reacts to selection changes
- Manages transform box lifecycle

#### Update Phase Systems

**blockUpdateSystem** (from UpdateBlocks):

- Handles all block CRUD commands
- Clipboard operations
- Clone/unclone
- Z-ordering (bring forward/send backward)
- Cursor management

**selectionUpdateSystem** (from UpdateSelection):

- Creates/updates/removes selection box entity
- Handles selection box intersection queries

**transformBoxUpdateSystem** (from UpdateTransformBox):

- Creates/updates transform box and handles
- Handles show/hide/edit states
- Creates scale/rotate/stretch handles

**dragHandlerSystem** (from UpdateDragHandler):

- Handles DragBlock command
- Implements move, rotate, scale, stretch logic
- Grid snapping
- Connector updates

### Step 6: Create Plugin Definition

```typescript
// src/plugins/infiniteCanvas/index.ts
export const InfiniteCanvasPlugin: EditorPlugin = {
  name: "infiniteCanvas",

  dependencies: ["core"], // Depends on CorePlugin for input handling

  components: [
    Block,
    Aabb,
    Selected,
    Hovered,
    Persistent,
    Locked,
    DragStart,
    TransformBox,
    TransformHandle,
    SelectionBox,
    Connector,
    Text,
    Edited,
  ],

  singletons: [
    SelectionState,
    TransformBoxState,
    Intersect,
    RankBounds,
    Cursor,
  ],

  captureSystems: [
    intersectSystem,
    selectCaptureSystem,
    transformBoxCaptureSystem,
  ],

  updateSystems: [
    blockUpdateSystem,
    selectionUpdateSystem,
    transformBoxUpdateSystem,
    dragHandlerSystem,
  ],

  commands: [], // Commands are defined separately and iterated in systems

  setup(ctx) {
    // Initialize RankBounds, etc.
  },
};
```

## File Structure

```
packages/editor/src/plugins/infiniteCanvas/
  index.ts                    - Plugin definition and exports

  components/
    index.ts
    Block.ts
    Aabb.ts
    Selected.ts
    Hovered.ts
    Persistent.ts
    Locked.ts
    DragStart.ts
    TransformBox.ts
    TransformHandle.ts
    SelectionBox.ts
    Connector.ts
    Text.ts
    Edited.ts
    Opacity.ts
    ScaleWithZoom.ts

  singletons/
    index.ts
    SelectionState.ts
    TransformBoxState.ts
    Intersect.ts
    RankBounds.ts
    Cursor.ts

  commands/
    index.ts
    selection.ts              - Selection-related commands
    blocks.ts                 - Block CRUD commands
    transformBox.ts           - Transform box commands
    clipboard.ts              - Cut/copy/paste commands

  systems/
    index.ts
    intersectSystem.ts        - From PreCaptureIntersect
    selectCaptureSystem.ts    - From PreCaptureSelect
    transformBoxCaptureSystem.ts - From CaptureTransformBox
    blockUpdateSystem.ts      - From UpdateBlocks
    selectionUpdateSystem.ts  - From UpdateSelection
    transformBoxUpdateSystem.ts - From UpdateTransformBox
    dragHandlerSystem.ts      - From UpdateDragHandler

  machines/
    index.ts
    selectionMachine.ts
    transformBoxMachine.ts

  helpers/
    index.ts
    aabb.ts
    intersect.ts
    transform.ts
    lexorank.ts
    pointerEvents.ts          - getPointerEvents helper

  types.ts                    - Shared types
  constants.ts                - Z-order ranks, thresholds, etc.
```

## Implementation Order

1. **Components & Singletons** - Define all data structures first
2. **Commands** - Define command types
3. **Helpers** - Port utility functions
4. **intersectSystem** - Foundation for hit testing
5. **selectionUpdateSystem** - Selection box management
6. **blockUpdateSystem** - Block CRUD (partial - selection commands)
7. **selectCaptureSystem** - Selection state machine
8. **transformBoxUpdateSystem** - Transform box creation
9. **transformBoxCaptureSystem** - Transform box state machine
10. **dragHandlerSystem** - Drag operations
11. **blockUpdateSystem** - Complete remaining commands
12. **Plugin assembly** - Wire everything together
13. **Testing** - Integration tests

## Key Considerations

### Entity References

The old system uses Becsy Entity objects. The new system uses numeric entity IDs. Commands that reference entities need to use `entityId: number` instead of `Entity`.

### Query Subscriptions

Some behaviors need to react to query changes (e.g., selection changes triggering transform box updates). Use `editor.subscribe()` or check for added/removed in queries.

### Store Sync

Components that need persistence should use `sync: "document"` option. Selection-related components typically use `sync: "presence"` or `sync: "none"`.

### Pointer Events Helper

The `getPointerEvents()` helper from BaseSystem should be ported to work with the new Pointer component. This is critical for the state machines.

### XState Integration

The `runMachine()` helper already exists in `machine.ts` and can be used directly.

## Dependencies

- `@infinitecanvas/ecs` - Core ECS framework
- `xstate` - State machines (already used)
- `@dalet-oss/lexorank` - Z-ordering (already used in core)

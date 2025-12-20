# Infinite Canvas Plugin Implementation Plan

## Overview

Port the core infinite canvas functionality from `@infinitecanvas/core` to the new ECS plugin architecture in `@infinitecanvas/editor`. This plugin provides the fundamental building blocks for selection, transformation, and block manipulation.

## Systems to Port

| Core System | Purpose | New Phase |
|-------------|---------|-----------|
| `PreCaptureIntersect` | Computes AABB, detects mouse-block intersections, manages hover state | `capture` |
| `PreCaptureSelect` | Selection state machine - handles pointing, dragging, selection box | `capture` |
| `CaptureTransformBox` | Transform box state machine - manages transform box lifecycle | `capture` |
| `UpdateBlocks` | Block CRUD operations, clipboard, selection commands, cursor | `update` |
| `UpdateSelection` | Selection box entity management and intersection queries | `update` |
| `UpdateTransformBox` | Transform box and handle creation/updates | `update` |
| `UpdateDragHandler` | Drag operations - move, rotate, scale, stretch | `update` |

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

## Implementation Steps

### Step 1: Define Components and Singletons

Create component/singleton definitions in `src/plugins/infiniteCanvas/components/`:
- `Block.ts` - Core block component (position, size, rotation, rank, tag)
- `Aabb.ts` - Axis-aligned bounding box for intersection
- `Selected.ts` - Selection marker with selectedBy field
- `Hovered.ts` - Hover state marker
- `Persistent.ts` - Marks blocks that persist to storage
- `Locked.ts` - Prevents editing/moving
- `DragStart.ts` - Stores initial transform for drag operations
- `TransformBox.ts` - Transform box wrapper around selection
- `TransformHandle.ts` - Scale/rotate/stretch handles
- `SelectionBox.ts` - Marquee selection rectangle
- `Connector.ts` - Arrow/line connectors between blocks
- `Text.ts` - Text content component
- `Edited.ts` - Marks blocks being edited

Singletons in `src/plugins/infiniteCanvas/singletons/`:
- `SelectionState.ts` - Selection state machine context
- `TransformBoxState.ts` - Transform box state machine context
- `Intersect.ts` - Current mouse-block intersection results
- `RankBounds.ts` - LexoRank bounds for z-ordering
- `Cursor.ts` - Current cursor state

### Step 2: Define Commands

Port commands from `CoreCommand` enum to typed command definitions in `src/plugins/infiniteCanvas/commands/`:

**Selection commands:**
- SelectBlock, DeselectBlock, ToggleSelect, DeselectAll, SelectAll

**Block manipulation:**
- DragBlock, RemoveBlock, RemoveSelected, DuplicateSelected
- BringForwardSelected, SendBackwardSelected

**Clipboard:**
- Cut, Copy, Paste

**Transform box:**
- AddOrUpdateTransformBox, UpdateTransformBox, HideTransformBox
- ShowTransformBox, RemoveTransformBox, StartTransformBoxEdit, EndTransformBoxEdit

**Selection box:**
- AddSelectionBox, UpdateSelectionBox, RemoveSelectionBox

**History:**
- CreateCheckpoint, Undo, Redo

**Cursor:**
- SetCursor, SetControls

**Clone operations:**
- CloneEntities, UncloneEntities

### Step 3: Port Helper Functions

Create utility modules in `src/plugins/infiniteCanvas/helpers/`:
- `aabb.ts` - computeAabb(), fastIntersectAabb()
- `intersect.ts` - intersectPoint() for hit testing
- `transform.ts` - rotation matrices, point transforms
- `lexorank.ts` - LexoRank utilities for z-ordering
- `pointerEvents.ts` - getPointerEvents helper

### Step 4: Port State Machines

In `src/plugins/infiniteCanvas/machines/`:
- `selectionMachine.ts` - From PreCaptureSelect
- `transformBoxMachine.ts` - From CaptureTransformBox

Actions emit commands via `CommandDef.spawn()` instead of `emitCommand()`.

### Step 5: Implement Systems

**Capture Phase Systems:**
- `intersectSystem.ts` - AABB updates, hit testing, hover state
- `selectCaptureSystem.ts` - Selection state machine
- `transformBoxCaptureSystem.ts` - Transform box state machine

**Update Phase Systems:**
- `blockUpdateSystem.ts` - Block CRUD, clipboard, z-ordering, cursor
- `selectionUpdateSystem.ts` - Selection box entity management
- `transformBoxUpdateSystem.ts` - Transform box/handle creation
- `dragHandlerSystem.ts` - Move, rotate, scale, stretch operations

### Step 6: Create Plugin Definition

```typescript
export const InfiniteCanvasPlugin: EditorPlugin = {
  name: "infiniteCanvas",
  dependencies: ["core"],
  components: [...],
  singletons: [...],
  captureSystems: [intersectSystem, selectCaptureSystem, transformBoxCaptureSystem],
  updateSystems: [blockUpdateSystem, selectionUpdateSystem, transformBoxUpdateSystem, dragHandlerSystem],
};
```

## File Structure

```
packages/editor/src/plugins/infiniteCanvas/
  index.ts
  components/
  singletons/
  commands/
  systems/
  machines/
  helpers/
  types.ts
  constants.ts
```

## Implementation Order

1. Components & Singletons
2. Commands
3. Helpers
4. intersectSystem
5. selectionUpdateSystem
6. blockUpdateSystem (partial - selection commands)
7. selectCaptureSystem
8. transformBoxUpdateSystem
9. transformBoxCaptureSystem
10. dragHandlerSystem
11. blockUpdateSystem (complete)
12. Plugin assembly
13. Testing

## Key Considerations

- Entity references use numeric `entityId` instead of Entity objects
- Use `editor.subscribe()` for query change reactions
- Components use `sync: "document"` for persistence, `sync: "presence"` for collaboration state
- Port `getPointerEvents()` helper for state machine events
- `runMachine()` already exists in `machine.ts`

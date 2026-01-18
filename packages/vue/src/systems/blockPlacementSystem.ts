import {
  type Context,
  type EntityId,
  createEntity,
  addComponent,
  defineEditorSystem,
  Controls,
  RankBounds,
  Block,
  Synced,
  PointerButton,
  getPointerInput,
  Cursor,
  getBlockDef,
  canBlockEdit,
} from "@infinitecanvas/editor";
import {
  SelectionStateSingleton,
  SelectionState,
  EditAfterPlacing,
} from "@infinitecanvas/plugin-selection";

/**
 * Snapshot format for creating blocks.
 * Keys are component names (lowercase), values are component data.
 */
type BlockSnapshot = Record<string, unknown> & {
  block: {
    tag: string;
    size?: [number, number];
    rank?: string;
  };
};

/**
 * Parse the snapshot from Controls.heldSnapshot.
 */
function parseSnapshot(heldSnapshot: string): BlockSnapshot | null {
  if (!heldSnapshot) return null;

  try {
    const snapshot = JSON.parse(heldSnapshot) as BlockSnapshot;
    if (!snapshot.block?.tag) {
      console.warn("Block snapshot missing required tag:", snapshot);
      return null;
    }
    return snapshot;
  } catch {
    console.warn("Invalid block snapshot JSON:", heldSnapshot);
    return null;
  }
}

/**
 * Create the block entity from snapshot at the given position.
 */
function createBlockFromSnapshot(
  ctx: Context,
  snapshot: BlockSnapshot,
  position: [number, number],
): EntityId {
  const blockDef = getBlockDef(ctx, snapshot.block.tag);
  if (!blockDef) {
    throw new Error(
      `Block placement: block definition for tag "${snapshot.block.tag}" not found`,
    );
  }

  // Get size from snapshot or use defaults
  const size: [number, number] = snapshot.block.size ?? [100, 100];

  // Calculate position to center the block on click point
  const left = position[0] - size[0] / 2;
  const top = position[1] - size[1] / 2;

  // Generate a rank for the new block (place at front)
  const rank = snapshot.block.rank ?? RankBounds.genNext(ctx);

  // Create the entity
  const entityId = createEntity(ctx);

  // Add Synced component for persistence (unless explicitly in snapshot)
  if (!("synced" in snapshot)) {
    addComponent(ctx, entityId, Synced, {
      id: crypto.randomUUID(),
    });
  }

  // Add Block component with computed position and rank
  const blockData = Object.assign({}, snapshot.block, {
    position: [left, top] as [number, number],
    size,
    rank,
  });
  addComponent(ctx, entityId, Block, blockData);

  for (const Comp of blockDef.components) {
    if (!(Comp.name in snapshot)) {
      addComponent(ctx, entityId, Comp);
    } else {
      const componentData = snapshot[Comp.name] as object;
      addComponent(ctx, entityId, Comp, componentData);
    }
  }

  return entityId;
}

/**
 * Place a block and set up selection state to Pointing.
 * The selectSystem will handle the threshold check, cursor, and deselection.
 */
function placeBlockAndSetupSelection(
  ctx: Context,
  snapshot: BlockSnapshot,
  worldPosition: [number, number],
  screenPosition: [number, number],
  mode: "dragOut" | "placement",
): void {
  // Create the block at the position
  const entityId = createBlockFromSnapshot(ctx, snapshot, worldPosition);

  // Get the block's position for draggedEntityStart
  const block = Block.read(ctx, entityId);

  // Mark block for editing after placement if it's editable
  if (canBlockEdit(ctx, snapshot.block.tag)) {
    addComponent(ctx, entityId, EditAfterPlacing, {});
  }

  // Set SelectionStateSingleton to Pointing state
  // selectSystem will handle: threshold check -> Dragging transition -> cursor + deselect
  const selectionState = SelectionStateSingleton.write(ctx);
  selectionState.state =
    mode === "dragOut" ? SelectionState.Dragging : SelectionState.Pointing;
  selectionState.dragStart = worldPosition;
  selectionState.draggedEntity = entityId;
  selectionState.draggedEntityStart = block.position;
  selectionState.pointingStartClient = screenPosition;
  selectionState.pointingStartWorld = worldPosition;
  selectionState.isCloning = false;

  // Reset controls to select tool and clear snapshot
  const controlsWrite = Controls.write(ctx);
  controlsWrite.leftMouseTool = "select";
  controlsWrite.heldSnapshot = "";

  const cursor = Cursor.write(ctx);
  cursor.cursorKind = "select";
  cursor.rotation = 0;
}

/**
 * Block placement system - handles placing blocks from toolbar tools.
 *
 * Supports two modes:
 * 1. Click-to-place: When heldSnapshot is set and user clicks on canvas
 * 2. Drag-out: When leftMouseTool is "placement" and user drags from toolbar onto canvas
 *
 * In both cases:
 * - Creates the block on the triggering event
 * - Sets SelectionStateSingleton to Dragging state
 * - The selectSystem handles subsequent dragging and pointerUp (selecting)
 */
export const blockPlacementSystem = defineEditorSystem(
  { phase: "capture" },
  (ctx: Context) => {
    const controls = Controls.read(ctx);

    // Only run when we have a snapshot to place
    if (!controls.heldSnapshot) return;

    // Get pointer events for left mouse button
    const events = getPointerInput(ctx, [PointerButton.Left]);
    if (events.length === 0) return;

    // Parse and validate snapshot
    const snapshot = parseSnapshot(controls.heldSnapshot);
    if (!snapshot) return;

    // Check if this is a drag-out or click-to-place
    const isDragOut = controls.leftMouseTool === "drag-out";

    if (isDragOut) {
      // Drag-out mode: Look for pointerMove (user dragged from toolbar onto canvas)
      // The pointer is already down from the toolbar, so we trigger on first move
      const pointerMoveEvent = events.find(
        (e) => e.type === "pointerMove" && !e.obscured,
      );
      if (!pointerMoveEvent) return;

      placeBlockAndSetupSelection(
        ctx,
        snapshot,
        pointerMoveEvent.worldPosition,
        pointerMoveEvent.screenPosition,
        "dragOut",
      );
    } else {
      // Click-to-place mode: Look for pointerDown
      const pointerDownEvent = events.find(
        (e) => e.type === "pointerDown" && !e.obscured,
      );
      if (!pointerDownEvent) return;

      placeBlockAndSetupSelection(
        ctx,
        snapshot,
        pointerDownEvent.worldPosition,
        pointerDownEvent.screenPosition,
        "placement",
      );
    }
  },
);

import {
  defineEditorSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  on,
  Block,
  Synced,
  Connector,
  Aabb,
  Opacity,
  ScaleWithZoom,
  RankBounds,
  getBackrefs,
  Intersect,
  getBlockDef,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Rect, type Vec2 } from "@infinitecanvas/math";
import { generateJitteredKeyBetween } from "fractional-indexing-jittered";

import {
  AddArrow,
  RemoveArrow,
  AddOrUpdateTransformHandles,
  RemoveTransformHandles,
  HideTransformHandles,
  ShowTransformHandles,
} from "../commands";
import {
  DragBlock,
  selectBlock,
  TransformHandle,
  SelectionStateSingleton,
  SelectionState,
} from "@infinitecanvas/plugin-selection";
import {
  ArcArrow,
  ElbowArrow,
  ArrowHandle,
  ArrowTerminal,
} from "../components";
import {
  ArrowKind,
  ArrowHandleKind,
  ArrowHeadKind,
  type ArrowHandleKind as ArrowHandleKindType,
} from "../types";
import {
  TRANSFORM_HANDLE_RANK,
  TRANSFORM_HANDLE_SIZE,
  DEFAULT_ARROW_THICKNESS,
  ELBOW_ARROW_PADDING,
  TERMINAL_SIZE,
  TERMINAL_SNAP_DISTANCE,
} from "../constants";
import { polarDelta, applyPolarDelta, calculateElbowPath } from "../helpers";

// Query for arrow handles
const arrowHandlesQuery = defineQuery((q) => q.with(ArrowHandle, Block));

// Query for synced blocks (for connector attachment)
const blocksQuery = defineQuery((q) => q.with(Synced, Aabb).tracking(Block));

// Query for arrow terminals
const terminalsQuery = defineQuery((q) => q.with(ArrowTerminal, Block));

/**
 * Update arrow transform system - handles arrow commands and geometry updates.
 *
 * Processes:
 * - AddArrow: Create new arrow entity
 * - DrawArrow: Update arrow geometry during drawing
 * - RemoveArrow: Delete arrow entity
 * - Transform handle operations
 * - Auto-update arrows when connected blocks change
 */
export const updateArrowTransformSystem = defineEditorSystem(
  { phase: "update" },
  (ctx: Context) => {
    on(ctx, AddArrow, (ctx, { entityId, position, kind }) => {
      addArrow(ctx, entityId, position, kind);
    });

    on(ctx, RemoveArrow, (ctx, { entityId }) => {
      removeArrow(ctx, entityId);
    });

    on(ctx, AddOrUpdateTransformHandles, (ctx, { arrowEntityId }) => {
      addOrUpdateTransformHandles(ctx, arrowEntityId);
    });

    on(ctx, RemoveTransformHandles, (ctx) => {
      removeTransformHandles(ctx);
    });

    on(ctx, HideTransformHandles, (ctx) => {
      hideTransformHandles(ctx);
    });

    on(ctx, ShowTransformHandles, (ctx) => {
      showTransformHandles(ctx);
    });

    on(ctx, DragBlock, (ctx, { entityId, position }) => {
      onBlockDrag(ctx, entityId, position);
    });

    // Update arrows when connected blocks change
    updateArrowsForChangedBlocks(ctx);
  },
);

/**
 * Check for changed or removed blocks and update any arrows connected to them.
 */
function updateArrowsForChangedBlocks(ctx: Context): void {
  const changedBlocks = blocksQuery.addedOrChangedOrRemoved(ctx);

  if (changedBlocks.length === 0) return;

  // Track which arrows we've already updated to avoid duplicates
  const updatedArrows = new Set<EntityId>();

  for (const blockId of changedBlocks) {
    // Find arrows connected to this block via startBlock
    // Use checkExistence=false to find refs to deleted blocks
    const startArrows = getBackrefs(
      ctx,
      blockId,
      Connector,
      "startBlock",
      false,
    );
    for (const arrowId of startArrows) {
      if (updatedArrows.has(arrowId)) continue;
      updatedArrows.add(arrowId);
      updateArrowForConnectedBlock(ctx, arrowId);
    }

    // Find arrows connected to this block via endBlock
    const endArrows = getBackrefs(ctx, blockId, Connector, "endBlock", false);
    for (const arrowId of endArrows) {
      if (updatedArrows.has(arrowId)) continue;
      updatedArrows.add(arrowId);
      updateArrowForConnectedBlock(ctx, arrowId);
    }
  }
}

/**
 * Update an arrow's geometry based on its connected blocks' current positions.
 */
function updateArrowForConnectedBlock(ctx: Context, arrowId: EntityId): void {
  const connector = Connector.read(ctx, arrowId);

  if (hasComponent(ctx, arrowId, ArcArrow)) {
    // Get current arrow endpoints
    const { a, c } = ArcArrow.getWorldPoints(ctx, arrowId);
    let newStart = a;
    let newEnd = c;

    // Update start position if connected
    if (connector.startBlock !== null) {
      newStart = Block.uvToWorld(
        ctx,
        connector.startBlock,
        connector.startBlockUv,
      );
      updateArcArrow(ctx, arrowId, ArrowHandleKind.Start, newStart);
    }

    // Update end position if connected
    if (connector.endBlock !== null) {
      newEnd = Block.uvToWorld(ctx, connector.endBlock, connector.endBlockUv);
      updateArcArrow(ctx, arrowId, ArrowHandleKind.End, newEnd);
    }
  } else if (hasComponent(ctx, arrowId, ElbowArrow)) {
    // Update start position if connected
    if (connector.startBlock !== null) {
      const newStart = Block.uvToWorld(
        ctx,
        connector.startBlock,
        connector.startBlockUv,
      );
      updateElbowArrow(ctx, arrowId, ArrowHandleKind.Start, newStart);
    }

    // Update end position if connected
    if (connector.endBlock !== null) {
      const newEnd = Block.uvToWorld(
        ctx,
        connector.endBlock,
        connector.endBlockUv,
      );
      updateElbowArrow(ctx, arrowId, ArrowHandleKind.End, newEnd);
    }
  }
}

/**
 * Add a new arrow entity at the given position.
 */
function addArrow(
  ctx: Context,
  entityId: EntityId,
  position: Vec2,
  kind: ArrowKind,
): void {
  const thickness = DEFAULT_ARROW_THICKNESS;

  const arrowTag = kind === ArrowKind.Elbow ? "elbow-arrow" : "arc-arrow";

  // Check if there's a block under the cursor to connect to
  const intersects = Intersect.getAll(ctx);
  const startBlockId =
    intersects.find(
      (eid) => hasComponent(ctx, eid, Synced) && canConnectToBlock(ctx, eid),
    ) ?? null;

  // If starting on a block, snap to nearest terminal or center
  let startPosition = position;
  let startBlockUv: Vec2 = [0, 0];
  if (startBlockId !== null) {
    // Try to snap to nearest terminal first (no distance limit for initial creation)
    const nearestTerminal = findNearestTerminal(ctx, startBlockId, position);
    if (nearestTerminal !== null) {
      startPosition = nearestTerminal.position;
      startBlockUv = nearestTerminal.uv;
    } else {
      // Fall back to center if no terminals defined
      startPosition = Block.uvToWorld(ctx, startBlockId, [0.5, 0.5]);
      startBlockUv = [0.5, 0.5];
    }
  }

  // Add Block component
  addComponent(ctx, entityId, Block, {
    tag: arrowTag,
    rank: RankBounds.genNext(ctx),
    position: startPosition,
    size: [thickness, thickness],
  });

  // Add Synced for persistence
  addComponent(ctx, entityId, Synced, {
    id: crypto.randomUUID(),
  });

  if (kind === ArrowKind.Arc) {
    addComponent(ctx, entityId, ArcArrow, {
      value: [0, 0, 0.5, 0.5, 1, 1, thickness],
      startArrowHead: ArrowHeadKind.None,
      endArrowHead: ArrowHeadKind.V,
    });
  } else {
    addComponent(ctx, entityId, ElbowArrow, {
      points: [0, 0, 0.5, 0, 0.5, 1, 1, 1],
      pointCount: 4,
      thickness,
      startArrowHead: ArrowHeadKind.None,
      endArrowHead: ArrowHeadKind.V,
    });
  }

  addComponent(ctx, entityId, Connector, {
    startBlock: startBlockId,
    startBlockUv: startBlockUv,
  });

  // Select the arrow and set up for handle dragging
  selectBlock(ctx, entityId);

  // Create transform handles
  const handles = addOrUpdateTransformHandles(ctx, entityId);
  const endHandle = handles.find((handleId) => {
    const handle = ArrowHandle.read(ctx, handleId);
    return handle.kind === ArrowHandleKind.End;
  });

  if (endHandle) {
    const handleBlock = Block.read(ctx, endHandle);
    const selectionState = SelectionStateSingleton.write(ctx);
    selectionState.state = SelectionState.Dragging;
    selectionState.draggedEntity = endHandle;
    selectionState.dragStart = startPosition;
    selectionState.draggedEntityStart = [
      handleBlock.position[0],
      handleBlock.position[1],
    ];
    // Hide handles during initial draw
    hideTransformHandles(ctx);
  }
}

/**
 * Remove an arrow entity.
 */
function removeArrow(ctx: Context, entityId: EntityId): void {
  removeEntity(ctx, entityId);
}

/**
 * Handle block drag events - routes to appropriate handler based on entity type.
 */
function onBlockDrag(ctx: Context, entityId: EntityId, position: Vec2): void {
  if (hasComponent(ctx, entityId, ArcArrow)) {
    onArcArrowDrag(ctx, entityId);
  } else if (hasComponent(ctx, entityId, ElbowArrow)) {
    onElbowArrowDrag(ctx, entityId);
  } else if (hasComponent(ctx, entityId, ArrowHandle)) {
    onArrowHandleDrag(ctx, entityId, position);
  }
}

/**
 * Handle arc arrow drag - updates connector when arrow itself is dragged.
 */
function onArcArrowDrag(ctx: Context, arrowEntityId: EntityId): void {
  const connector = Connector.read(ctx, arrowEntityId);

  // Update start connector if attached
  if (connector.startBlock !== null) {
    const { a } = ArcArrow.getWorldPoints(ctx, arrowEntityId);
    updateConnector(ctx, arrowEntityId, ArrowHandleKind.Start, a);
  }

  // Update end connector if attached
  if (connector.endBlock !== null) {
    const { c } = ArcArrow.getWorldPoints(ctx, arrowEntityId);
    updateConnector(ctx, arrowEntityId, ArrowHandleKind.End, c);
  }
}

/**
 * Handle elbow arrow drag - updates connector when arrow itself is dragged.
 */
function onElbowArrowDrag(ctx: Context, arrowEntityId: EntityId): void {
  const connector = Connector.read(ctx, arrowEntityId);

  // Update start connector if attached
  if (connector.startBlock !== null) {
    const start = ElbowArrow.getStartWorld(ctx, arrowEntityId);
    updateConnector(ctx, arrowEntityId, ArrowHandleKind.Start, start);
  }

  // Update end connector if attached
  if (connector.endBlock !== null) {
    const end = ElbowArrow.getEndWorld(ctx, arrowEntityId);
    updateConnector(ctx, arrowEntityId, ArrowHandleKind.End, end);
  }
}

/**
 * Handle arrow handle drag - updates arrow geometry when handle is dragged.
 */
function onArrowHandleDrag(
  ctx: Context,
  handleId: EntityId,
  position: Vec2,
): void {
  const handle = ArrowHandle.read(ctx, handleId);
  const arrowEntityId = handle.arrowEntity;
  if (!arrowEntityId) return;

  const handleBlock = Block.read(ctx, handleId);
  let handlePosition: Vec2 = [
    position[0] + handleBlock.size[0] / 2,
    position[1] + handleBlock.size[1] / 2,
  ];

  // Check for terminal snapping before updating arrow geometry
  if (handle.kind !== ArrowHandleKind.Middle) {
    const snappedPosition = getSnappedPosition(
      ctx,
      arrowEntityId,
      handle.kind as ArrowHandleKindType,
      handlePosition,
    );
    if (snappedPosition !== null) {
      handlePosition = snappedPosition;
    }
  }

  if (hasComponent(ctx, arrowEntityId, ArcArrow)) {
    updateArcArrow(
      ctx,
      arrowEntityId,
      handle.kind as ArrowHandleKindType,
      handlePosition,
    );
  } else if (hasComponent(ctx, arrowEntityId, ElbowArrow)) {
    updateElbowArrow(
      ctx,
      arrowEntityId,
      handle.kind as ArrowHandleKindType,
      handlePosition,
    );
  }

  if (handle.kind !== ArrowHandleKind.Middle) {
    updateConnector(
      ctx,
      arrowEntityId,
      handle.kind as ArrowHandleKindType,
      handlePosition,
    );
  }
}

/**
 * Add or update transform handles for an arrow.
 * Creates handles if they don't exist, updates existing ones, and removes unused ones.
 */
function addOrUpdateTransformHandles(
  ctx: Context,
  arrowEntityId: EntityId,
): EntityId[] {
  const handleSize = TRANSFORM_HANDLE_SIZE;

  // Determine which handle kinds are needed
  const neededKinds: ArrowHandleKindType[] = [
    ArrowHandleKind.Start,
    ArrowHandleKind.End,
  ];

  if (hasComponent(ctx, arrowEntityId, ArcArrow)) {
    neededKinds.push(ArrowHandleKind.Middle);
  }

  // Build a map of existing handles by kind for reuse
  const existingHandles = Array.from(arrowHandlesQuery.current(ctx));
  const handleMap = new Map<ArrowHandleKindType, EntityId>();
  for (const handleId of existingHandles) {
    const handle = ArrowHandle.read(ctx, handleId);
    handleMap.set(handle.kind as ArrowHandleKindType, handleId);
  }

  // Track which handles we're using
  const usedHandleIds = new Set<EntityId>();

  // Create or update handles
  for (const handleKind of neededKinds) {
    const position = getHandlePosition(ctx, arrowEntityId, handleKind);
    const left = position[0] - handleSize / 2;
    const top = position[1] - handleSize / 2;

    let handleId = handleMap.get(handleKind);

    if (!handleId) {
      handleId = createEntity(ctx);

      addComponent(ctx, handleId, ArrowHandle);
      addComponent(ctx, handleId, Block);
      addComponent(ctx, handleId, ScaleWithZoom);
      addComponent(ctx, handleId, TransformHandle, { kind: "arrow" });
    }

    const handle = ArrowHandle.write(ctx, handleId);
    handle.kind = handleKind;
    handle.arrowEntity = arrowEntityId;

    const handleBlock = Block.write(ctx, handleId);
    handleBlock.tag = "arrow-handle";
    handleBlock.rank = TRANSFORM_HANDLE_RANK;
    handleBlock.position = [left, top];
    handleBlock.size = [handleSize, handleSize];

    const swz = ScaleWithZoom.write(ctx, handleId);
    swz.startPosition = [left, top];
    swz.startSize = [handleSize, handleSize];

    usedHandleIds.add(handleId);
  }

  // Remove unused handles
  for (const handleId of existingHandles) {
    if (!usedHandleIds.has(handleId)) {
      removeEntity(ctx, handleId);
    }
  }

  // Hide handles if currently dragging an arrow handle
  const selectionState = SelectionStateSingleton.read(ctx);
  if (
    selectionState.state === SelectionState.Dragging &&
    selectionState.draggedEntity !== null &&
    hasComponent(ctx, selectionState.draggedEntity, ArrowHandle)
  ) {
    hideTransformHandles(ctx);
  }

  return Array.from(usedHandleIds);
}

/**
 * Remove all transform handles.
 */
function removeTransformHandles(ctx: Context): void {
  for (const handleId of arrowHandlesQuery.current(ctx)) {
    removeEntity(ctx, handleId);
  }
  // Also remove any terminals
  removeAllTerminals(ctx);
}

/**
 * Hide transform handles temporarily.
 */
function hideTransformHandles(ctx: Context): void {
  for (const handleId of arrowHandlesQuery.current(ctx)) {
    if (!hasComponent(ctx, handleId, Opacity)) {
      addComponent(ctx, handleId, Opacity, { value: 0 });
    } else {
      const opacity = Opacity.write(ctx, handleId);
      opacity.value = 0;
    }
  }
}

/**
 * Show transform handles.
 */
function showTransformHandles(ctx: Context): void {
  const handles = arrowHandlesQuery.current(ctx);

  for (const handleId of handles) {
    if (hasComponent(ctx, handleId, Opacity)) {
      removeComponent(ctx, handleId, Opacity);
    }
  }

  // Update handle positions
  if (handles.length > 0) {
    const handle = ArrowHandle.read(ctx, handles[0]);
    if (handle.arrowEntity) {
      addOrUpdateTransformHandles(ctx, handle.arrowEntity);
    }
  }

  // Remove terminals when dragging ends
  removeAllTerminals(ctx);
}

/**
 * Get the world position for a handle on an arrow.
 */
function getHandlePosition(
  ctx: Context,
  arrowEntityId: EntityId,
  handleKind: ArrowHandleKindType,
): Vec2 {
  if (hasComponent(ctx, arrowEntityId, ArcArrow)) {
    const { a, b, c } = ArcArrow.getWorldPoints(ctx, arrowEntityId);
    switch (handleKind) {
      case ArrowHandleKind.Start:
        return a;
      case ArrowHandleKind.Middle:
        return b;
      case ArrowHandleKind.End:
        return c;
    }
  }

  if (hasComponent(ctx, arrowEntityId, ElbowArrow)) {
    switch (handleKind) {
      case ArrowHandleKind.Start:
        return ElbowArrow.getStartWorld(ctx, arrowEntityId);
      case ArrowHandleKind.End:
        return ElbowArrow.getEndWorld(ctx, arrowEntityId);
    }
  }

  console.warn("Arrow entity has no recognized arrow component");
  return [0, 0];
}

/**
 * Update arc arrow geometry when a handle is moved.
 */
function updateArcArrow(
  ctx: Context,
  entityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2,
): void {
  // Get current world positions
  const {
    a: aWorld,
    b: bWorld,
    c: cWorld,
  } = ArcArrow.getWorldPoints(ctx, entityId);

  let newAWorld = aWorld;
  let newBWorld = bWorld;
  let newCWorld = cWorld;

  let start: Vec2 = [0, 0];
  let origin: Vec2 = [0, 0];

  if (handleKind === ArrowHandleKind.Start) {
    start = aWorld;
    origin = cWorld;
    newAWorld = handlePosition;
  } else if (handleKind === ArrowHandleKind.Middle) {
    newBWorld = handlePosition;
  } else {
    start = cWorld;
    origin = aWorld;
    newCWorld = handlePosition;
  }

  // b turns around the origin same amount as the dragged handle
  if (handleKind !== ArrowHandleKind.Middle) {
    const { angle, distance } = polarDelta(start, handlePosition, origin);
    newBWorld = applyPolarDelta(bWorld, angle, 0.5 * distance, origin);
  }

  // Update block bounds
  const blockWrite = Block.write(ctx, entityId);
  const minX = Math.min(newAWorld[0], newBWorld[0], newCWorld[0]);
  const minY = Math.min(newAWorld[1], newBWorld[1], newCWorld[1]);
  const maxX = Math.max(newAWorld[0], newBWorld[0], newCWorld[0]);
  const maxY = Math.max(newAWorld[1], newBWorld[1], newCWorld[1]);

  blockWrite.position = [minX, minY];
  blockWrite.size = [maxX - minX || 1, maxY - minY || 1];

  // Update UV coordinates
  ArcArrow.setA(ctx, entityId, Block.worldToUv(ctx, entityId, newAWorld));
  ArcArrow.setB(ctx, entityId, Block.worldToUv(ctx, entityId, newBWorld));
  ArcArrow.setC(ctx, entityId, Block.worldToUv(ctx, entityId, newCWorld));
}

/**
 * Update elbow arrow geometry when a handle is moved.
 */
function updateElbowArrow(
  ctx: Context,
  entityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2,
): void {
  // Get connector for routing and live positions
  const connector = Connector.read(ctx, entityId);

  let start: Vec2;
  let end: Vec2;

  if (handleKind === ArrowHandleKind.Start) {
    start = handlePosition;
    // Get live end position from connector if connected, otherwise use arrow geometry
    if (connector.endBlock !== null) {
      end = Block.uvToWorld(ctx, connector.endBlock, connector.endBlockUv);
    } else {
      end = ElbowArrow.getEndWorld(ctx, entityId);
    }
  } else {
    // Get live start position from connector if connected, otherwise use arrow geometry
    if (connector.startBlock !== null) {
      start = Block.uvToWorld(
        ctx,
        connector.startBlock,
        connector.startBlockUv,
      );
    } else {
      start = ElbowArrow.getStartWorld(ctx, entityId);
    }
    end = handlePosition;
  }

  // Get arrow rotation for path calculation
  const block = Block.read(ctx, entityId);
  const rotation = block.rotateZ || 0;

  // Calculate new path using refs directly
  const path = calculateElbowPath(
    ctx,
    start,
    end,
    connector.startBlock,
    connector.endBlock,
    ELBOW_ARROW_PADDING,
    rotation,
  );

  // Update block bounds (accounting for rotation)
  const blockWrite = Block.write(ctx, entityId);
  const position: Vec2 = [0, 0];
  const size: Vec2 = [1, 1];
  Rect.boundPoints(position, size, rotation, path);
  blockWrite.position = position;
  blockWrite.size = [Math.max(size[0], 1), Math.max(size[1], 1)];

  // Convert path to UV and store
  const uvPath = path.map((p) => Block.worldToUv(ctx, entityId, p));
  ElbowArrow.setPoints(ctx, entityId, uvPath);
}

/**
 * Update connector attachment for an arrow endpoint.
 */
function updateConnector(
  ctx: Context,
  entityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2,
): void {
  const intersects = Intersect.getAll(ctx);
  let attachmentBlockId =
    intersects.find(
      (eid) =>
        eid !== entityId &&
        hasComponent(ctx, eid, Synced) &&
        !hasComponent(ctx, eid, Connector) &&
        canConnectToBlock(ctx, eid),
    ) ?? null;

  const connector = Connector.write(ctx, entityId);

  // Don't allow connecting both ends to the same block
  if (attachmentBlockId !== null) {
    const otherEnd =
      handleKind === ArrowHandleKind.Start
        ? connector.endBlock
        : connector.startBlock;
    if (attachmentBlockId === otherEnd) {
      attachmentBlockId = null;
    }
  }

  // Show or hide terminals based on whether we're over a connectable block
  if (attachmentBlockId !== null) {
    showTerminalsForBlock(ctx, attachmentBlockId);
  } else {
    removeAllTerminals(ctx);
  }

  let uv: Vec2 = [0, 0];
  if (attachmentBlockId !== null) {
    // Check for terminal snapping
    const snapTerminal = findNearestTerminal(
      ctx,
      attachmentBlockId,
      handlePosition,
      TERMINAL_SNAP_DISTANCE,
    );
    if (snapTerminal !== null) {
      uv = snapTerminal.uv;
    } else {
      uv = Block.worldToUv(ctx, attachmentBlockId, handlePosition);
    }
  }

  if (handleKind === ArrowHandleKind.Start) {
    connector.startBlock = attachmentBlockId;
    connector.startBlockUv = uv;
  } else {
    connector.endBlock = attachmentBlockId;
    connector.endBlockUv = uv;
  }

  updateConnectorRank(ctx, entityId);
}

function updateConnectorRank(ctx: Context, entityId: EntityId): void {
  const connector = Connector.read(ctx, entityId);

  // connectors always have high rank than their connected blocks
  let maxRank: string | null = null;
  for (const connectedBlockId of [connector.startBlock, connector.endBlock]) {
    if (connectedBlockId === null) continue;

    const rank = Block.read(ctx, connectedBlockId).rank;
    if (maxRank === null || rank > maxRank) {
      maxRank = rank;
    }
  }

  const blockRank = Block.read(ctx, entityId).rank;
  if (maxRank !== null && blockRank < maxRank) {
    const block = Block.write(ctx, entityId);
    block.rank = generateJitteredKeyBetween(maxRank, null);
  }
}

/**
 * Check if a block can have connectors attached to it.
 */
function canConnectToBlock(ctx: Context, entityId: EntityId): boolean {
  const tag = Block.read(ctx, entityId).tag;
  const blockDef = getBlockDef(ctx, tag);
  return blockDef.connectors.enabled;
}

/**
 * Get the block ID that currently has terminals shown, or null if none.
 */
function getCurrentTerminalBlockId(ctx: Context): EntityId | null {
  const terminals = terminalsQuery.current(ctx);
  if (terminals.length === 0) return null;
  return ArrowTerminal.read(ctx, terminals[0]).blockEntity;
}

/**
 * Show terminals for a block. Creates terminal entities at each terminal position.
 */
function showTerminalsForBlock(ctx: Context, blockId: EntityId): void {
  // If terminals are already shown for this block, do nothing
  if (getCurrentTerminalBlockId(ctx) === blockId) return;

  // Remove existing terminals
  removeAllTerminals(ctx);

  const tag = Block.read(ctx, blockId).tag;
  const blockDef = getBlockDef(ctx, tag);

  if (!blockDef.connectors.enabled) return;

  const terminals = blockDef.connectors.terminals;

  for (let i = 0; i < terminals.length; i++) {
    const uv = terminals[i];
    const worldPos = Block.uvToWorld(ctx, blockId, uv);

    const terminalId = createEntity(ctx);

    addComponent(ctx, terminalId, ArrowTerminal, {
      blockEntity: blockId,
      terminalIndex: i,
    });

    addComponent(ctx, terminalId, Block, {
      tag: "arrow-terminal",
      rank: TRANSFORM_HANDLE_RANK,
      position: [
        worldPos[0] - TERMINAL_SIZE / 2,
        worldPos[1] - TERMINAL_SIZE / 2,
      ],
      size: [TERMINAL_SIZE, TERMINAL_SIZE],
    });

    addComponent(ctx, terminalId, ScaleWithZoom, {
      startPosition: [
        worldPos[0] - TERMINAL_SIZE / 2,
        worldPos[1] - TERMINAL_SIZE / 2,
      ],
      startSize: [TERMINAL_SIZE, TERMINAL_SIZE],
    });
  }
}

/**
 * Remove all terminal entities.
 */
function removeAllTerminals(ctx: Context): void {
  for (const terminalId of terminalsQuery.current(ctx)) {
    removeEntity(ctx, terminalId);
  }
}

/**
 * Find the nearest terminal to a position.
 * @param maxDistance - Optional max distance limit. If not provided, returns nearest terminal regardless of distance.
 * Returns the terminal's world position if found, null if no terminals defined or none within distance.
 */
function findNearestTerminal(
  ctx: Context,
  blockId: EntityId,
  position: Vec2,
  maxDistance?: number,
): { position: Vec2; uv: Vec2 } | null {
  const tag = Block.read(ctx, blockId).tag;
  const blockDef = getBlockDef(ctx, tag);

  if (!blockDef.connectors.enabled) return null;

  const terminals = blockDef.connectors.terminals;
  if (terminals.length === 0) return null;

  let closestTerminal: { position: Vec2; uv: Vec2 } | null = null;
  let closestDistance = maxDistance ?? Infinity;

  for (const uv of terminals) {
    const worldPos = Block.uvToWorld(ctx, blockId, uv);
    const dx = worldPos[0] - position[0];
    const dy = worldPos[1] - position[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestTerminal = {
        position: worldPos,
        uv: uv as Vec2,
      };
    }
  }

  return closestTerminal;
}

/**
 * Get the snapped world position if within snap distance of a terminal.
 * Returns null if no snapping should occur.
 */
function getSnappedPosition(
  ctx: Context,
  arrowEntityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2,
): Vec2 | null {
  const intersects = Intersect.getAll(ctx);
  const attachmentBlockId =
    intersects.find(
      (eid) =>
        eid !== arrowEntityId &&
        hasComponent(ctx, eid, Synced) &&
        !hasComponent(ctx, eid, Connector) &&
        canConnectToBlock(ctx, eid),
    ) ?? null;

  if (attachmentBlockId === null) return null;

  // Don't allow connecting both ends to the same block
  const connector = Connector.read(ctx, arrowEntityId);
  const otherEnd =
    handleKind === ArrowHandleKind.Start
      ? connector.endBlock
      : connector.startBlock;
  if (attachmentBlockId === otherEnd) return null;

  const snapTerminal = findNearestTerminal(
    ctx,
    attachmentBlockId,
    handlePosition,
    TERMINAL_SNAP_DISTANCE,
  );
  if (snapTerminal === null) return null;

  return snapTerminal.position;
}

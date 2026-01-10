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
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import type { Vec2 } from "@infinitecanvas/math";

import {
  AddArrow,
  DrawArrow,
  RemoveArrow,
  AddOrUpdateTransformHandles,
  RemoveTransformHandles,
  HideTransformHandles,
  ShowTransformHandles,
} from "../commands";
import { DragBlock, TransformHandle } from "@infinitecanvas/plugin-selection";
import { ArcArrow, ElbowArrow, ArrowHandle } from "../components";
import { ArrowDrawState } from "../singletons";
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
} from "../constants";
import {
  polarDelta,
  applyPolarDelta,
  calculateElbowPath,
} from "../helpers";

// Query for arrow handles
const arrowHandlesQuery = defineQuery((q) => q.with(ArrowHandle, Block));

// Query for synced blocks (for connector attachment)
const blocksQuery = defineQuery((q) => q.with(Synced, Aabb).tracking(Block));

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
    on(ctx, AddArrow, (ctx, { position, kind }) => {
      addArrow(ctx, position, kind);
    });

    on(ctx, DrawArrow, (ctx, { entityId, start, end }) => {
      drawArrow(ctx, entityId, start, end);
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
  }
);

/**
 * Check for changed blocks and update any arrows connected to them.
 */
function updateArrowsForChangedBlocks(ctx: Context): void {
  const changedBlocks = blocksQuery.changed(ctx);
  if (changedBlocks.length === 0) return;

  // Track which arrows we've already updated to avoid duplicates
  const updatedArrows = new Set<EntityId>();

  for (const blockId of changedBlocks) {
    // Skip arrows themselves - we only care about blocks that arrows connect to
    if (
      hasComponent(ctx, blockId, ArcArrow) ||
      hasComponent(ctx, blockId, ElbowArrow)
    ) {
      continue;
    }

    // Find arrows connected to this block via startBlock
    const startArrows = getBackrefs(ctx, blockId, Connector, "startBlock");
    for (const arrowId of startArrows) {
      if (updatedArrows.has(arrowId)) continue;
      updatedArrows.add(arrowId);
      updateArrowForConnectedBlock(ctx, arrowId);
    }

    // Find arrows connected to this block via endBlock
    const endArrows = getBackrefs(ctx, blockId, Connector, "endBlock");
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
      const block = Block.read(ctx, connector.startBlock);
      newStart = [
        block.position[0] + connector.startBlockUv[0] * block.size[0],
        block.position[1] + connector.startBlockUv[1] * block.size[1],
      ];
      updateArcArrow(ctx, arrowId, ArrowHandleKind.Start, newStart);
    }

    // Update end position if connected
    if (connector.endBlock !== null) {
      const block = Block.read(ctx, connector.endBlock);
      newEnd = [
        block.position[0] + connector.endBlockUv[0] * block.size[0],
        block.position[1] + connector.endBlockUv[1] * block.size[1],
      ];
      updateArcArrow(ctx, arrowId, ArrowHandleKind.End, newEnd);
    }
  } else if (hasComponent(ctx, arrowId, ElbowArrow)) {
    // Update start position if connected
    if (connector.startBlock !== null) {
      const block = Block.read(ctx, connector.startBlock);
      const newStart: Vec2 = [
        block.position[0] + connector.startBlockUv[0] * block.size[0],
        block.position[1] + connector.startBlockUv[1] * block.size[1],
      ];
      updateElbowArrow(ctx, arrowId, ArrowHandleKind.Start, newStart);
    }

    // Update end position if connected
    if (connector.endBlock !== null) {
      const block = Block.read(ctx, connector.endBlock);
      const newEnd: Vec2 = [
        block.position[0] + connector.endBlockUv[0] * block.size[0],
        block.position[1] + connector.endBlockUv[1] * block.size[1],
      ];
      updateElbowArrow(ctx, arrowId, ArrowHandleKind.End, newEnd);
    }
  }
}

/**
 * Add a new arrow entity at the given position.
 */
function addArrow(ctx: Context, position: Vec2, kind: ArrowKind): void {
  const thickness = DEFAULT_ARROW_THICKNESS;

  const arrowTag = kind === ArrowKind.Elbow ? "elbow-arrow" : "arc-arrow";

  // Create arrow entity
  const entityId = createEntity(ctx);

  // Add Block component
  addComponent(ctx, entityId, Block, {
    tag: arrowTag,
    rank: RankBounds.genNext(ctx),
    position: [position[0] - thickness / 2, position[1] - thickness / 2],
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

  // Add Connector component
  addComponent(ctx, entityId, Connector, {});

  // Update connector for start position
  updateConnector(ctx, entityId, ArrowHandleKind.Start, position);

  // Store reference to active arrow in state singleton
  const state = ArrowDrawState.write(ctx);
  state.activeArrow = entityId;
}

/**
 * Update arrow geometry during drawing.
 */
function drawArrow(
  ctx: Context,
  entityId: EntityId,
  start: Vec2,
  end: Vec2
): void {
  if (hasComponent(ctx, entityId, ArcArrow)) {
    const block = Block.write(ctx, entityId);
    block.position = [
      Math.min(start[0], end[0]),
      Math.min(start[1], end[1]),
    ];
    block.size = [
      Math.abs(start[0] - end[0]) || 1,
      Math.abs(start[1] - end[1]) || 1,
    ];

    const { value } = ArcArrow.write(ctx, entityId);
    const ax = start[0] < end[0] ? 0 : 1;
    const ay = start[1] < end[1] ? 0 : 1;
    value[0] = ax; // aX
    value[1] = ay; // aY
    value[2] = 0.5; // bX
    value[3] = 0.5; // bY
    value[4] = 1 - ax; // cX
    value[5] = 1 - ay; // cY
  } else if (hasComponent(ctx, entityId, ElbowArrow)) {
    updateElbowArrow(ctx, entityId, ArrowHandleKind.End, end);
  }

  updateConnector(ctx, entityId, ArrowHandleKind.End, end);
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
function onArrowHandleDrag(ctx: Context, handleId: EntityId, position: Vec2): void {
  const handle = ArrowHandle.read(ctx, handleId);
  const arrowEntityId = handle.arrowEntityId;
  if (!arrowEntityId) return;

  const handleBlock = Block.read(ctx, handleId);
  const handlePosition: Vec2 = [
    position[0] + handleBlock.size[0] / 2,
    position[1] + handleBlock.size[1] / 2,
  ];

  if (hasComponent(ctx, arrowEntityId, ArcArrow)) {
    updateArcArrow(ctx, arrowEntityId, handle.kind as ArrowHandleKindType, handlePosition);
  } else if (hasComponent(ctx, arrowEntityId, ElbowArrow)) {
    updateElbowArrow(ctx, arrowEntityId, handle.kind as ArrowHandleKindType, handlePosition);
  }

  if (handle.kind !== ArrowHandleKind.Middle) {
    updateConnector(ctx, arrowEntityId, handle.kind as ArrowHandleKindType, handlePosition);
  }
}

/**
 * Add or update transform handles for an arrow.
 * Creates handles if they don't exist, updates existing ones, and removes unused ones.
 */
function addOrUpdateTransformHandles(ctx: Context, arrowEntityId: EntityId): void {
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
      addComponent(ctx, handleId, TransformHandle, { kind: 'arrow' });
    }

    const handle = ArrowHandle.write(ctx, handleId);
    handle.kind = handleKind;
    handle.arrowEntityId = arrowEntityId;

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
}

/**
 * Remove all transform handles.
 */
function removeTransformHandles(ctx: Context): void {
  for (const handleId of arrowHandlesQuery.current(ctx)) {
    removeEntity(ctx, handleId);
  }
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
    if (handle.arrowEntityId) {
      console.log("Updating handle positions for arrow", handle.arrowEntityId);
      addOrUpdateTransformHandles(ctx, handle.arrowEntityId);
    }
  }
}

/**
 * Get the world position for a handle on an arrow.
 */
function getHandlePosition(
  ctx: Context,
  arrowEntityId: EntityId,
  handleKind: ArrowHandleKindType
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
  handlePosition: Vec2
): void {
  // Get current world positions
  const { a: aWorld, b: bWorld, c: cWorld } = ArcArrow.getWorldPoints(ctx, entityId);

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
  ArcArrow.setA(ctx, entityId, ArcArrow.worldToUv(ctx, entityId, newAWorld));
  ArcArrow.setB(ctx, entityId, ArcArrow.worldToUv(ctx, entityId, newBWorld));
  ArcArrow.setC(ctx, entityId, ArcArrow.worldToUv(ctx, entityId, newCWorld));
}

/**
 * Update elbow arrow geometry when a handle is moved.
 */
function updateElbowArrow(
  ctx: Context,
  entityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2
): void {
  let start: Vec2;
  let end: Vec2;

  if (handleKind === ArrowHandleKind.Start) {
    start = handlePosition;
    end = ElbowArrow.getEndWorld(ctx, entityId);
  } else {
    start = ElbowArrow.getStartWorld(ctx, entityId);
    end = handlePosition;
  }

  // Get connector for routing
  const connector = Connector.read(ctx, entityId);

  // Calculate new path using refs directly
  const path = calculateElbowPath(
    ctx,
    start,
    end,
    connector.startBlock,
    connector.endBlock,
    ELBOW_ARROW_PADDING
  );

  // Update block bounds
  const blockWrite = Block.write(ctx, entityId);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const point of path) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }

  blockWrite.position = [minX, minY];
  blockWrite.size = [maxX - minX || 1, maxY - minY || 1];

  // Convert path to UV and store
  const uvPath = path.map((p) => ElbowArrow.worldToUv(ctx, entityId, p));
  ElbowArrow.setPoints(ctx, entityId, uvPath);
}

/**
 * Update connector attachment for an arrow endpoint.
 */
function updateConnector(
  ctx: Context,
  entityId: EntityId,
  handleKind: ArrowHandleKindType,
  handlePosition: Vec2
): void {
  // Find block at position (excluding arrows and handles)
  let attachmentBlockId: EntityId | null = null;

  for (const blockId of blocksQuery.current(ctx)) {
    // Skip arrows and handles
    if (
      hasComponent(ctx, blockId, ArcArrow) ||
      hasComponent(ctx, blockId, ElbowArrow) ||
      hasComponent(ctx, blockId, ArrowHandle)
    ) {
      continue;
    }

    const block = Block.read(ctx, blockId);

    // Check if point is inside block
    if (
      handlePosition[0] >= block.position[0] &&
      handlePosition[0] <= block.position[0] + block.size[0] &&
      handlePosition[1] >= block.position[1] &&
      handlePosition[1] <= block.position[1] + block.size[1]
    ) {
      attachmentBlockId = blockId;
      break;
    }
  }

  const connector = Connector.write(ctx, entityId);

  if (handleKind === ArrowHandleKind.Start) {
    connector.startBlock = attachmentBlockId;
    if (attachmentBlockId !== null) {
      const block = Block.read(ctx, attachmentBlockId);
      connector.startBlockUv[0] =
        (handlePosition[0] - block.position[0]) / (block.size[0] || 1);
      connector.startBlockUv[1] =
        (handlePosition[1] - block.position[1]) / (block.size[1] || 1);
    } else {
      connector.startBlockUv[0] = 0;
      connector.startBlockUv[1] = 0;
    }
  } else {
    connector.endBlock = attachmentBlockId;
    if (attachmentBlockId !== null) {
      const block = Block.read(ctx, attachmentBlockId);
      connector.endBlockUv[0] =
        (handlePosition[0] - block.position[0]) / (block.size[0] || 1);
      connector.endBlockUv[1] =
        (handlePosition[1] - block.position[1]) / (block.size[1] || 1);
    } else {
      connector.endBlockUv[0] = 0;
      connector.endBlockUv[1] = 0;
    }
  }
}

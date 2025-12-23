import {
  defineSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  on,
  type Context,
  type EntityId,
  Camera,
} from "@infinitecanvas/editor";
import { Vec2, Aabb as AabbNs } from "@infinitecanvas/math";

import {
  Block,
  Aabb,
  Selected,
  TransformBox,
  TransformHandle,
  DragStart,
  Locked,
  Opacity,
  Edited,
  ScaleWithZoom,
} from "../components";
import {
  AddOrUpdateTransformBox,
  UpdateTransformBox as UpdateTransformBoxCmd,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
  StartTransformBoxEdit,
  EndTransformBoxEdit,
} from "../commands";
import { getBlockDef } from "../helpers";
import { TransformHandleKind, CursorKind } from "../types";

// Query for transform box entities
const transformBoxQuery = defineQuery((q) => q.with(Block).with(TransformBox));

// Query for transform handle entities
const transformHandleQuery = defineQuery((q) =>
  q.with(Block).with(TransformHandle)
);

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block).with(Selected));

// Query for edited blocks
const editedBlocksQuery = defineQuery((q) => q.with(Block).with(Edited));

// Transform box z-order rank
const TRANSFORM_BOX_RANK = "z";
const TRANSFORM_HANDLE_CORNER_RANK = "za";
const TRANSFORM_HANDLE_EDGE_RANK = "zb";
const TRANSFORM_HANDLE_ROTATE_RANK = "zc";

/**
 * Transform box update system - manages transform box and handles.
 */
export const UpdateTransformBox = defineSystem((ctx: Context) => {
  // RemoveTransformBox must be first to avoid stale references
  on(ctx, RemoveTransformBox, removeTransformBox);
  on(ctx, AddOrUpdateTransformBox, addOrUpdateTransformBox);
  on(ctx, UpdateTransformBoxCmd, () => updateTransformBox(ctx));
  on(ctx, HideTransformBox, hideTransformBox);
  on(ctx, ShowTransformBox, showTransformBox);
  on(ctx, StartTransformBoxEdit, startTransformBoxEdit);
  on(ctx, EndTransformBoxEdit, endTransformBoxEdit);
});

/**
 * Remove transform box and all handles.
 */
function removeTransformBox(ctx: Context): void {
  // Remove all handles
  for (const handleId of transformHandleQuery.current(ctx)) {
    removeEntity(ctx, handleId);
  }

  // Remove transform box
  for (const boxId of transformBoxQuery.current(ctx)) {
    removeEntity(ctx, boxId);
  }

  // End editing if in edit mode
  const selectedBlocks = Array.from(selectedBlocksQuery.current(ctx));
  const isEditing =
    selectedBlocks.length &&
    selectedBlocks.every((id) => hasComponent(ctx, id, Edited));

  if (isEditing) {
    endTransformBoxEdit(ctx);
  }
}

/**
 * Add or update transform box.
 */
function addOrUpdateTransformBox(ctx: Context): void {
  let transformBoxId: EntityId;

  const existingBoxes = transformBoxQuery.current(ctx);
  if (existingBoxes.length > 0) {
    transformBoxId = existingBoxes[0];
  } else {
    // Create new transform box
    transformBoxId = createEntity(ctx);
    addComponent(ctx, transformBoxId, Block, {
      tag: "transformBox",
      position: [0, 0],
      size: [0, 0],
      rotateZ: 0,
      rank: TRANSFORM_BOX_RANK,
    });
    addComponent(ctx, transformBoxId, TransformBox, {});
    addComponent(ctx, transformBoxId, DragStart, {
      position: [0, 0],
      size: [0, 0],
      rotateZ: 0,
      fontSize: 16,
    });
  }

  updateTransformBox(ctx, transformBoxId);
}

/**
 * Update transform box bounds to match selection.
 */
function updateTransformBox(ctx: Context, transformBoxId?: EntityId): void {
  if (!transformBoxId) {
    const existingBoxes = transformBoxQuery.current(ctx);
    if (existingBoxes.length === 0) {
      console.warn("No transform box to update");
      return;
    }
    transformBoxId = existingBoxes[0];
  }

  const selectedBlocks = selectedBlocksQuery.current(ctx);
  if (selectedBlocks.length === 0) return;

  // Get common rotation (or 0 if mixed)
  let rotateZ = 0;
  const firstBlock = Block.read(ctx, selectedBlocks[0]);
  rotateZ = firstBlock.rotateZ;

  for (let i = 1; i < selectedBlocks.length; i++) {
    const block = Block.read(ctx, selectedBlocks[i]);
    if (Math.abs(rotateZ - block.rotateZ) > 0.01) {
      rotateZ = 0;
      break;
    }
  }

  // Compute bounding box of all selected blocks
  const allCorners: Vec2[] = [];
  for (const entityId of selectedBlocks) {
    allCorners.push(...Block.getCorners(ctx, entityId));
  }

  if (allCorners.length === 0) return;

  // Calculate bounds
  let minX = allCorners[0][0];
  let minY = allCorners[0][1];
  let maxX = allCorners[0][0];
  let maxY = allCorners[0][1];

  for (const corner of allCorners) {
    minX = Math.min(minX, corner[0]);
    minY = Math.min(minY, corner[1]);
    maxX = Math.max(maxX, corner[0]);
    maxY = Math.max(maxY, corner[1]);
  }

  // Update transform box block
  const boxBlock = Block.write(ctx, transformBoxId);
  boxBlock.position = [minX, minY];
  boxBlock.size = [maxX - minX, maxY - minY];
  boxBlock.rotateZ = rotateZ;

  // Update DragStart
  if (hasComponent(ctx, transformBoxId, DragStart)) {
    const dragStart = DragStart.write(ctx, transformBoxId);
    dragStart.position = [minX, minY];
    dragStart.size = [maxX - minX, maxY - minY];
    dragStart.rotateZ = rotateZ;
  }

  // Update DragStart for selected blocks
  for (const entityId of selectedBlocks) {
    const block = Block.read(ctx, entityId);

    if (!hasComponent(ctx, entityId, DragStart)) {
      addComponent(ctx, entityId, DragStart, {
        position: [block.position[0], block.position[1]],
        size: [block.size[0], block.size[1]],
        rotateZ: block.rotateZ,
        fontSize: 16,
      });
    } else {
      const dragStart = DragStart.write(ctx, entityId);
      dragStart.position = [block.position[0], block.position[1]];
      dragStart.size = [block.size[0], block.size[1]];
      dragStart.rotateZ = block.rotateZ;
    }
  }

  // Update or create transform handles
  addOrUpdateTransformHandles(ctx, transformBoxId);
}

/**
 * Transform handle definition for creating handles.
 */
interface TransformHandleDef {
  tag: string;
  kind: TransformHandleKind;
  vectorX: number;
  vectorY: number;
  cursorKind: CursorKind;
  left: number;
  top: number;
  width: number;
  height: number;
  rotateZ: number;
  rank: string;
}

/**
 * Rotate a point around a center point.
 */
function rotatePoint(point: Vec2, center: Vec2, angleRad: number): Vec2 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
}

/**
 * Add or update transform handles around the transform box.
 */
function addOrUpdateTransformHandles(
  ctx: Context,
  transformBoxId: EntityId
): void {
  const boxBlock = Block.read(ctx, transformBoxId);
  const { position, size, rotateZ } = boxBlock;
  const left = position[0];
  const top = position[1];
  const width = size[0];
  const height = size[1];
  const center: Vec2 = [left + width / 2, top + height / 2];

  const handleSize = 12;
  const rotationHandleSize = 2 * handleSize;
  const sideHandleSize = 2 * handleSize;

  const handles: TransformHandleDef[] = [];

  const rotateCursorKinds = [
    CursorKind.RotateNW,
    CursorKind.RotateNE,
    CursorKind.RotateSW,
    CursorKind.RotateSE,
  ];

  // Get selected blocks and determine capabilities
  const selectedBlocks = Array.from(selectedBlocksQuery.current(ctx));

  let resizeMode: "scale" | "text" | "free" | "groupOnly" = "scale";
  if (selectedBlocks.length === 1) {
    const block = Block.read(ctx, selectedBlocks[0]);
    const blockDef = getBlockDef(ctx, block.tag);
    resizeMode = blockDef.resizeMode;
  }

  // Check if all selected blocks can rotate/scale
  const canRotate = selectedBlocks.every((id) => {
    const block = Block.read(ctx, id);
    const blockDef = getBlockDef(ctx, block.tag);
    return blockDef.canRotate;
  });

  const canScale = selectedBlocks.every((id) => {
    const block = Block.read(ctx, id);
    const blockDef = getBlockDef(ctx, block.tag);
    return blockDef.canScale;
  });

  // Determine handle kind based on resize mode
  let handleKind: TransformHandleKind;
  switch (resizeMode) {
    case "scale":
    case "text":
      handleKind = TransformHandleKind.Scale;
      break;
    case "free":
      handleKind = TransformHandleKind.Stretch;
      break;
    default:
      handleKind = TransformHandleKind.Scale;
      break;
  }

  // Calculate scaled dimensions for visibility threshold
  const camera = Camera.read(ctx);
  const scaledWidth = width * camera.zoom;
  const scaledHeight = height * camera.zoom;
  const minDim = Math.min(scaledWidth, scaledHeight);
  const threshold = 15;

  // Corner handles (scale and rotation)
  for (let xi = 0; xi < 2; xi++) {
    for (let yi = 0; yi < 2; yi++) {
      // Skip some corners when selection is too small
      if (xi + yi !== 1 && minDim < threshold / 2) {
        continue;
      }
      if (xi + yi === 1 && scaledHeight < threshold) {
        continue;
      }

      if (canScale) {
        // Corner scale handles
        handles.push({
          tag: "transformHandle",
          kind: handleKind,
          vectorX: xi * 2 - 1,
          vectorY: yi * 2 - 1,
          left: left + width * xi - handleSize / 2,
          top: top + height * yi - handleSize / 2,
          width: handleSize,
          height: handleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_CORNER_RANK,
          cursorKind: xi + yi === 1 ? CursorKind.NESW : CursorKind.NWSE,
        });
      }

      if (canRotate) {
        // Corner rotation handles
        handles.push({
          tag: "div",
          kind: TransformHandleKind.Rotate,
          vectorX: xi * 2 - 1,
          vectorY: yi * 2 - 1,
          left:
            left -
            rotationHandleSize +
            handleSize / 2 +
            xi * (width + rotationHandleSize - handleSize),
          top:
            top -
            rotationHandleSize +
            handleSize / 2 +
            yi * (height + rotationHandleSize - handleSize),
          width: rotationHandleSize,
          height: rotationHandleSize,
          rotateZ,
          rank: TRANSFORM_HANDLE_ROTATE_RANK,
          cursorKind: rotateCursorKinds[xi + yi * 2],
        });
      }
    }
  }

  // Top & bottom edge handles
  if (canScale) {
    for (let yi = 0; yi < 2; yi++) {
      handles.push({
        tag: "div",
        kind: handleKind,
        vectorX: 0,
        vectorY: yi * 2 - 1,
        left,
        top: top + height * yi - sideHandleSize / 2,
        width,
        height: sideHandleSize,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.NS,
      });
    }
  }

  // Left & right edge handles
  if (canScale || resizeMode === "text") {
    for (let xi = 0; xi < 2; xi++) {
      handles.push({
        tag: "div",
        kind: resizeMode === "text" ? TransformHandleKind.Stretch : handleKind,
        vectorX: xi * 2 - 1,
        vectorY: 0,
        left: left + width * xi - sideHandleSize / 2,
        top,
        width: sideHandleSize,
        height,
        rotateZ,
        rank: TRANSFORM_HANDLE_EDGE_RANK,
        cursorKind: CursorKind.EW,
      });
    }
  }

  // Get existing handles and build a map for reuse
  const existingHandles = Array.from(transformHandleQuery.current(ctx));
  const handleMap = new Map<string, EntityId>();
  for (const handleId of existingHandles) {
    const handle = TransformHandle.read(ctx, handleId);
    const key = `${handle.kind}-${handle.vectorX}-${handle.vectorY}`;
    handleMap.set(key, handleId);
  }

  // Track which handles we're using
  const usedHandleIds = new Set<EntityId>();

  // Create or update handles
  for (const def of handles) {
    const key = `${def.kind}-${def.vectorX}-${def.vectorY}`;
    let handleId = handleMap.get(key);

    // Calculate rotated position
    const handleCenter: Vec2 = [
      def.left + def.width / 2,
      def.top + def.height / 2,
    ];
    const rotatedCenter = rotatePoint(handleCenter, center, rotateZ);
    const finalLeft = rotatedCenter[0] - def.width / 2;
    const finalTop = rotatedCenter[1] - def.height / 2;

    if (!handleId) {
      // Create new handle
      handleId = createEntity(ctx);
      addComponent(ctx, handleId, Block, {
        tag: def.tag,
        position: [finalLeft, finalTop],
        size: [def.width, def.height],
        rotateZ: def.rotateZ,
        rank: def.rank,
      });
      addComponent(ctx, handleId, TransformHandle, {
        kind: def.kind,
        vectorX: def.vectorX,
        vectorY: def.vectorY,
        transformBoxId,
        cursorKind: def.cursorKind,
      });
      addComponent(ctx, handleId, DragStart, {
        position: [finalLeft, finalTop],
        size: [def.width, def.height],
        rotateZ: def.rotateZ,
        fontSize: 16,
      });
      addComponent(ctx, handleId, ScaleWithZoom, {});
    } else {
      // Update existing handle
      const block = Block.write(ctx, handleId);
      block.position = [finalLeft, finalTop];
      block.size = [def.width, def.height];
      block.rotateZ = def.rotateZ;
      block.rank = def.rank;

      const handle = TransformHandle.write(ctx, handleId);
      handle.transformBoxId = transformBoxId;
      handle.kind = def.kind;
      handle.vectorX = def.vectorX;
      handle.vectorY = def.vectorY;
      handle.cursorKind = def.cursorKind;

      if (hasComponent(ctx, handleId, DragStart)) {
        const dragStart = DragStart.write(ctx, handleId);
        dragStart.position = [finalLeft, finalTop];
        dragStart.size = [def.width, def.height];
        dragStart.rotateZ = def.rotateZ;
      }
    }

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
 * Hide transform box and handles.
 */
function hideTransformBox(ctx: Context): void {
  for (const boxId of transformBoxQuery.current(ctx)) {
    if (!hasComponent(ctx, boxId, Opacity)) {
      addComponent(ctx, boxId, Opacity, { value: 0 });
    } else {
      const opacity = Opacity.write(ctx, boxId);
      opacity.value = 0;
    }
  }

  for (const handleId of transformHandleQuery.current(ctx)) {
    if (!hasComponent(ctx, handleId, Opacity)) {
      addComponent(ctx, handleId, Opacity, { value: 0 });
    } else {
      const opacity = Opacity.write(ctx, handleId);
      opacity.value = 0;
    }
  }
}

/**
 * Show transform box and handles.
 */
function showTransformBox(ctx: Context): void {
  for (const boxId of transformBoxQuery.current(ctx)) {
    if (hasComponent(ctx, boxId, Locked)) continue;
    if (hasComponent(ctx, boxId, Opacity)) {
      removeComponent(ctx, boxId, Opacity);
    }
  }

  for (const handleId of transformHandleQuery.current(ctx)) {
    if (hasComponent(ctx, handleId, Opacity)) {
      removeComponent(ctx, handleId, Opacity);
    }
  }

  // Update transform box to reflect any changes
  updateTransformBox(ctx);
}

/**
 * Start transform box edit mode.
 */
function startTransformBoxEdit(ctx: Context): void {
  for (const boxId of transformBoxQuery.current(ctx)) {
    if (!hasComponent(ctx, boxId, Locked)) {
      addComponent(ctx, boxId, Locked, {});
    }
  }

  // Mark selected blocks as edited
  for (const blockId of selectedBlocksQuery.current(ctx)) {
    if (!hasComponent(ctx, blockId, Edited)) {
      addComponent(ctx, blockId, Edited, {});
    }
  }

  // Remove handles during edit
  for (const handleId of transformHandleQuery.current(ctx)) {
    removeEntity(ctx, handleId);
  }
}

/**
 * End transform box edit mode.
 */
function endTransformBoxEdit(ctx: Context): void {
  for (const boxId of transformBoxQuery.current(ctx)) {
    if (hasComponent(ctx, boxId, Locked)) {
      removeComponent(ctx, boxId, Locked);
    }
  }

  // Remove edited from blocks
  for (const blockId of editedBlocksQuery.current(ctx)) {
    if (hasComponent(ctx, blockId, Edited)) {
      removeComponent(ctx, blockId, Edited);
    }
  }
}

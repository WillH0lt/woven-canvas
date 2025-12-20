import {
  defineSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  type Context,
  type EntityId,
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
  UpdateTransformBox,
  HideTransformBox,
  ShowTransformBox,
  RemoveTransformBox,
  StartTransformBoxEdit,
  EndTransformBoxEdit,
} from "../commands";
import { TransformHandleKind, CursorKind } from "../types";

// Query for transform box entities
const transformBoxQuery = defineQuery((q) => q.with(Block).with(TransformBox));

// Query for transform handle entities
const transformHandleQuery = defineQuery((q) => q.with(Block).with(TransformHandle));

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
 *
 * Processes:
 * - AddOrUpdateTransformBox: Creates or updates transform box for selection
 * - UpdateTransformBox: Updates transform box bounds
 * - HideTransformBox: Hides transform box and handles
 * - ShowTransformBox: Shows transform box and handles
 * - RemoveTransformBox: Removes transform box and handles
 * - StartTransformBoxEdit: Enters edit mode
 * - EndTransformBoxEdit: Exits edit mode
 */
export const transformBoxUpdateSystem = defineSystem((ctx: Context) => {
  // Handle RemoveTransformBox command (before others to avoid stale references)
  for (const _ of RemoveTransformBox.iter(ctx)) {
    removeTransformBoxInternal(ctx);
  }

  // Handle AddOrUpdateTransformBox command
  for (const _ of AddOrUpdateTransformBox.iter(ctx)) {
    addOrUpdateTransformBoxInternal(ctx);
  }

  // Handle UpdateTransformBox command
  for (const _ of UpdateTransformBox.iter(ctx)) {
    updateTransformBoxInternal(ctx);
  }

  // Handle HideTransformBox command
  for (const _ of HideTransformBox.iter(ctx)) {
    hideTransformBoxInternal(ctx);
  }

  // Handle ShowTransformBox command
  for (const _ of ShowTransformBox.iter(ctx)) {
    showTransformBoxInternal(ctx);
  }

  // Handle StartTransformBoxEdit command
  for (const _ of StartTransformBoxEdit.iter(ctx)) {
    startTransformBoxEditInternal(ctx);
  }

  // Handle EndTransformBoxEdit command
  for (const _ of EndTransformBoxEdit.iter(ctx)) {
    endTransformBoxEditInternal(ctx);
  }
});

/**
 * Remove transform box and all handles.
 */
function removeTransformBoxInternal(ctx: Context): void {
  // Remove all handles
  for (const handleId of transformHandleQuery.current(ctx)) {
    removeEntity(ctx, handleId);
  }

  // Remove transform box
  for (const boxId of transformBoxQuery.current(ctx)) {
    removeEntity(ctx, boxId);
  }

  // End editing if in edit mode
  const isEditing = Array.from(selectedBlocksQuery.current(ctx)).every(
    (id) => hasComponent(ctx, id, Edited)
  );
  if (isEditing) {
    endTransformBoxEditInternal(ctx);
  }
}

/**
 * Add or update transform box.
 */
function addOrUpdateTransformBoxInternal(ctx: Context): void {
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

  updateTransformBoxInternal(ctx, transformBoxId);
}

/**
 * Update transform box bounds to match selection.
 */
function updateTransformBoxInternal(ctx: Context, transformBoxId?: EntityId): void {
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
    const corners = Block.getCorners(ctx, entityId);
    allCorners.push(...corners);
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
 * Add or update transform handles around the transform box.
 */
function addOrUpdateTransformHandles(ctx: Context, transformBoxId: EntityId): void {
  const boxBlock = Block.read(ctx, transformBoxId);
  const { position, size, rotateZ } = boxBlock;
  const left = position[0];
  const top = position[1];
  const width = size[0];
  const height = size[1];

  const handleSize = 12;

  // For now, create simple corner handles
  const handleDefs = [
    { vectorX: -1, vectorY: -1, cursorKind: CursorKind.NWSE }, // top-left
    { vectorX: 1, vectorY: -1, cursorKind: CursorKind.NESW }, // top-right
    { vectorX: 1, vectorY: 1, cursorKind: CursorKind.NWSE }, // bottom-right
    { vectorX: -1, vectorY: 1, cursorKind: CursorKind.NESW }, // bottom-left
  ];

  // Get existing handles
  const existingHandles = Array.from(transformHandleQuery.current(ctx));

  for (let i = 0; i < handleDefs.length; i++) {
    const def = handleDefs[i];
    const handleX = left + ((def.vectorX + 1) / 2) * width - handleSize / 2;
    const handleY = top + ((def.vectorY + 1) / 2) * height - handleSize / 2;

    let handleId: EntityId;

    // Reuse existing handle or create new one
    if (i < existingHandles.length) {
      handleId = existingHandles[i];
    } else {
      handleId = createEntity(ctx);
      addComponent(ctx, handleId, Block, {
        tag: "transformHandle",
        position: [handleX, handleY],
        size: [handleSize, handleSize],
        rotateZ,
        rank: TRANSFORM_HANDLE_CORNER_RANK,
      });
      addComponent(ctx, handleId, TransformHandle, {
        kind: TransformHandleKind.Scale,
        vectorX: def.vectorX,
        vectorY: def.vectorY,
        transformBoxId,
        cursorKind: def.cursorKind,
      });
      addComponent(ctx, handleId, DragStart, {
        position: [handleX, handleY],
        size: [handleSize, handleSize],
        rotateZ,
        fontSize: 16,
      });
      addComponent(ctx, handleId, ScaleWithZoom, {});
    }

    // Update position
    const block = Block.write(ctx, handleId);
    block.position = [handleX, handleY];
    block.rotateZ = rotateZ;

    // Update transform handle reference
    const handle = TransformHandle.write(ctx, handleId);
    handle.transformBoxId = transformBoxId;
    handle.vectorX = def.vectorX;
    handle.vectorY = def.vectorY;
    handle.cursorKind = def.cursorKind;
  }

  // Remove extra handles
  for (let i = handleDefs.length; i < existingHandles.length; i++) {
    removeEntity(ctx, existingHandles[i]);
  }
}

/**
 * Hide transform box and handles.
 */
function hideTransformBoxInternal(ctx: Context): void {
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
function showTransformBoxInternal(ctx: Context): void {
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
  updateTransformBoxInternal(ctx);
}

/**
 * Start transform box edit mode.
 */
function startTransformBoxEditInternal(ctx: Context): void {
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
function endTransformBoxEditInternal(ctx: Context): void {
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

import {
  defineSystem,
  defineQuery,
  hasComponent,
  on,
  type Context,
  type EntityId,
  Block,
  getLocalSelectedBlocks,
} from "@infinitecanvas/editor";
import { Vec2, Scalar } from "@infinitecanvas/math";

import { TransformBox, TransformHandle, DragStart } from "../../components";
import { DragBlock } from "../../commands";
import { TransformHandleKind } from "../../types";

// Query for transform box
const transformBoxQuery = defineQuery((q) =>
  q.with(Block, TransformBox, DragStart)
);

/**
 * Drag handler system - updates selected blocks when transform box moves.
 *
 * This system listens for DragBlock commands on transform box and handles,
 * and updates the selected blocks accordingly:
 * - When transform box moves: move all selected blocks by the same delta
 * - When scale handle moves: scale all selected blocks proportionally
 * - When rotate handle moves: rotate all selected blocks around the center
 */
export const dragHandlerSystem = defineSystem((ctx: Context) => {
  // Listen for DragBlock commands and handle transform box/handle drags
  on(ctx, DragBlock, (ctx, { entityId, position }) => {
    // Check if dragging transform box
    if (hasComponent(ctx, entityId, TransformBox)) {
      onTransformBoxDrag(ctx, entityId, position);
      return;
    }

    // Check if dragging transform handle
    if (hasComponent(ctx, entityId, TransformHandle)) {
      onTransformHandleDrag(ctx, entityId, position);
      return;
    }
  });
});

/**
 * Handle transform box drag - move all selected blocks by the same delta.
 * @param position - The new position being set on the transform box
 */
function onTransformBoxDrag(
  ctx: Context,
  boxId: EntityId,
  position: Vec2
): void {
  const boxStart = DragStart.read(ctx, boxId);

  const dx = position[0] - boxStart.position[0];
  const dy = position[1] - boxStart.position[1];

  for (const blockId of getLocalSelectedBlocks(ctx)) {
    if (!hasComponent(ctx, blockId, DragStart)) continue;
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    block.position = [blockStart.position[0] + dx, blockStart.position[1] + dy];
  }
}

/**
 * Handle transform handle drag - scale or rotate based on handle kind.
 * @param position - The new position being set on the handle
 */
function onTransformHandleDrag(
  ctx: Context,
  handleId: EntityId,
  position: Vec2
): void {
  const handle = TransformHandle.read(ctx, handleId);

  if (handle.kind === TransformHandleKind.Rotate) {
    onRotateHandleDrag(ctx, handleId, position);
  } else if (handle.kind === TransformHandleKind.Scale) {
    onScaleHandleDrag(ctx, handleId, position, true);
  } else if (handle.kind === TransformHandleKind.Stretch) {
    onScaleHandleDrag(ctx, handleId, position, false);
  }
}

/**
 * Handle rotate handle drag - rotate all selected blocks around center.
 * @param position - The new position being set on the handle
 */
function onRotateHandleDrag(
  ctx: Context,
  handleId: EntityId,
  position: Vec2
): void {
  const transformBoxes = transformBoxQuery.current(ctx);
  if (transformBoxes.length === 0) {
    console.warn("No transform box found for rotation");
    return;
  }

  const boxId = transformBoxes[0];
  const boxBlock = Block.write(ctx, boxId);
  const boxCenter = Block.getCenter(ctx, boxId);

  const handleBlock = Block.read(ctx, handleId);
  // Use the new position to calculate handle center
  const handleCenter: Vec2 = [
    position[0] + handleBlock.size[0] / 2,
    position[1] + handleBlock.size[1] / 2,
  ];

  // Calculate angle from center to handle
  const angleHandle = Vec2.angleTo(boxCenter, handleCenter);
  const dragStart = DragStart.read(ctx, boxId);

  const handle = TransformHandle.read(ctx, handleId);
  const handleStartAngle =
    Vec2.angle([
      boxBlock.size[0] * handle.vectorX,
      boxBlock.size[1] * handle.vectorY,
    ]) + dragStart.rotateZ;

  const delta = angleHandle - handleStartAngle;

  // Update transform box rotation so cursor system can detect the change
  boxBlock.rotateZ = Scalar.normalizeAngle(dragStart.rotateZ + delta);

  // Update all selected blocks
  for (const blockId of getLocalSelectedBlocks(ctx)) {
    if (!hasComponent(ctx, blockId, DragStart)) continue;
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    // Update rotation
    block.rotateZ = Scalar.normalizeAngle(blockStart.rotateZ + delta);

    // Rotate position around box center
    const startCenter: Vec2 = [
      blockStart.position[0] + blockStart.size[0] / 2,
      blockStart.position[1] + blockStart.size[1] / 2,
    ];

    const r = Vec2.distance(boxCenter, startCenter);
    const angle = Vec2.angleTo(boxCenter, startCenter) + delta;

    const newCenter = Vec2.fromPolar(r, angle, boxCenter);
    block.position = [
      newCenter[0] - block.size[0] / 2,
      newCenter[1] - block.size[1] / 2,
    ];
  }
}

/**
 * Handle scale/stretch handle drag - scale all selected blocks.
 * @param position - The new position being set on the handle
 * @param maintainAspectRatio - Whether to maintain aspect ratio
 */
function onScaleHandleDrag(
  ctx: Context,
  handleId: EntityId,
  position: Vec2,
  maintainAspectRatio: boolean
): void {
  const transformBoxes = transformBoxQuery.current(ctx);
  if (transformBoxes.length === 0) {
    console.warn("No transform box found for scaling");
    return;
  }

  const boxId = transformBoxes[0];
  const boxStart = DragStart.read(ctx, boxId);

  const handle = TransformHandle.read(ctx, handleId);
  const handleBlock = Block.read(ctx, handleId);

  // Calculate handle center from the new position
  const handleCenter: Vec2 = [
    position[0] + handleBlock.size[0] / 2,
    position[1] + handleBlock.size[1] / 2,
  ];

  // Calculate the opposite corner position from the START state (fixed anchor point)
  // The opposite corner is on the opposite side of the box from the handle
  const boxRotateZ = boxStart.rotateZ;
  const boxStartCenter: Vec2 = [
    boxStart.position[0] + boxStart.size[0] / 2,
    boxStart.position[1] + boxStart.size[1] / 2,
  ];

  // Calculate opposite corner in local space, then rotate to world space
  // Handle vector is [-1,-1], [-1,1], [1,-1], or [1,1] for corners
  // Opposite corner is at -vector direction from center
  const oppositeLocal: Vec2 = [
    (-handle.vectorX * boxStart.size[0]) / 2,
    (-handle.vectorY * boxStart.size[1]) / 2,
  ];
  Vec2.rotate(oppositeLocal, boxRotateZ);
  const oppositeCenter: Vec2 = [
    boxStartCenter[0] + oppositeLocal[0],
    boxStartCenter[1] + oppositeLocal[1],
  ];

  // Calculate difference from opposite corner to handle center
  const difference: Vec2 = [
    handleCenter[0] - oppositeCenter[0],
    handleCenter[1] - oppositeCenter[1],
  ];

  // Rotate difference into local space to get proper width/height
  const localDiff = Vec2.clone(difference);
  Vec2.rotate(localDiff, -boxRotateZ);

  // Flip handle vectors when crossing over (dragging past the opposite corner)
  let vectorX = handle.vectorX;
  let vectorY = handle.vectorY;
  if (Math.sign(localDiff[0]) !== vectorX && vectorX !== 0) {
    vectorX = -vectorX;
  }
  if (Math.sign(localDiff[1]) !== vectorY && vectorY !== 0) {
    vectorY = -vectorY;
  }

  // Calculate new dimensions in local space
  let newWidth = Math.max(Math.abs(localDiff[0]), 1);
  let newHeight = Math.max(Math.abs(localDiff[1]), 1);

  // Maintain aspect ratio if needed
  if (maintainAspectRatio) {
    const startRatio = boxStart.size[0] / boxStart.size[1];
    const newRatio = newWidth / newHeight;

    if (newRatio > startRatio) {
      newHeight = newWidth / startRatio;
    } else {
      newWidth = newHeight * startRatio;
    }
  } else {
    // Stretch mode - only change dimension for the axis being dragged
    if (handle.vectorX === 0) {
      newWidth = boxStart.size[0];
    } else if (handle.vectorY === 0) {
      newHeight = boxStart.size[1];
    }
  }

  // Calculate scale factors
  const scaleX = boxStart.size[0] > 0 ? newWidth / boxStart.size[0] : 1;
  const scaleY = boxStart.size[1] > 0 ? newHeight / boxStart.size[1] : 1;

  // Calculate new box center by rotating the scaled vector back to world space
  // and adding half of it to the opposite corner
  const vec: Vec2 = Vec2.create(vectorX * newWidth, vectorY * newHeight);
  Vec2.rotate(vec, boxRotateZ);
  Vec2.scale(vec, 0.5);

  const newBoxCenter: Vec2 = Vec2.clone(oppositeCenter);
  Vec2.add(newBoxCenter, vec);

  const scaleFactor: Vec2 = [scaleX, scaleY];

  // Update all selected blocks
  // We use centers for position calculations since they're rotation-independent
  for (const blockId of getLocalSelectedBlocks(ctx)) {
    if (!hasComponent(ctx, blockId, DragStart)) continue;
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    // Calculate block's start center
    const blockStartCenter: Vec2 = Vec2.clone(blockStart.position);
    Vec2.add(blockStartCenter, [
      blockStart.size[0] / 2,
      blockStart.size[1] / 2,
    ]);

    // Calculate offset from box center to block center
    const offsetFromBoxCenter: Vec2 = Vec2.clone(blockStartCenter);
    Vec2.sub(offsetFromBoxCenter, boxStartCenter);

    // Transform to local space, scale, transform back to world space
    Vec2.rotate(offsetFromBoxCenter, -boxRotateZ);
    Vec2.multiply(offsetFromBoxCenter, scaleFactor);
    Vec2.rotate(offsetFromBoxCenter, boxRotateZ);

    // Add scaled offset to new box center
    const newBlockCenter: Vec2 = Vec2.clone(newBoxCenter);
    Vec2.add(newBlockCenter, offsetFromBoxCenter);

    // Scale size
    const newBlockSize: Vec2 = Vec2.clone(blockStart.size);
    Vec2.multiply(newBlockSize, scaleFactor);

    // Convert center back to top-left position
    Vec2.copy(block.position, newBlockCenter);
    Vec2.sub(block.position, [newBlockSize[0] / 2, newBlockSize[1] / 2]);
    Vec2.copy(block.size, newBlockSize);
  }
}

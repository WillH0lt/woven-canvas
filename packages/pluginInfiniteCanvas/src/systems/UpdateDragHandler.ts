import {
  defineSystem,
  defineQuery,
  hasComponent,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Vec2 } from "@infinitecanvas/math";

import {
  Block,
  Selected,
  TransformBox,
  TransformHandle,
  DragStart,
} from "../components";
import { TransformHandleKind } from "../types";

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) =>
  q.with(Block).with(Selected).with(DragStart)
);

// Query for transform box
const transformBoxQuery = defineQuery((q) =>
  q.with(Block).with(TransformBox).with(DragStart).tracking(Block)
);

// Query for transform handles
const transformHandleQuery = defineQuery((q) =>
  q.with(Block).with(TransformHandle).with(DragStart).tracking(Block)
);

/**
 * Drag handler system - updates selected blocks when transform box moves.
 *
 * This system monitors transform box and handle changes and updates
 * the selected blocks accordingly:
 * - When transform box moves: move all selected blocks by the same delta
 * - When scale handle moves: scale all selected blocks proportionally
 * - When rotate handle moves: rotate all selected blocks around the center
 */
export const UpdateDragHandler = defineSystem((ctx: Context) => {
  // Check for transform box changes
  for (const boxId of transformBoxQuery.changed(ctx)) {
    onTransformBoxMove(ctx, boxId);
  }

  // Check for transform handle changes (scale/rotate)
  for (const handleId of transformHandleQuery.changed(ctx)) {
    const handle = TransformHandle.read(ctx, handleId);
    if (handle.kind === TransformHandleKind.Rotate) {
      onRotateHandleMove(ctx, handleId);
    } else if (handle.kind === TransformHandleKind.Scale) {
      onScaleHandleMove(ctx, handleId, true);
    } else if (handle.kind === TransformHandleKind.Stretch) {
      onScaleHandleMove(ctx, handleId, false);
    }
  }
});

/**
 * Handle transform box movement - move all selected blocks by the same delta.
 */
function onTransformBoxMove(ctx: Context, boxId: EntityId): void {
  const boxStart = DragStart.read(ctx, boxId);
  const boxBlock = Block.read(ctx, boxId);

  const dx = boxBlock.position[0] - boxStart.position[0];
  const dy = boxBlock.position[1] - boxStart.position[1];

  for (const blockId of selectedBlocksQuery.current(ctx)) {
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    block.position = [
      blockStart.position[0] + dx,
      blockStart.position[1] + dy,
    ];
  }
}

/**
 * Handle rotate handle movement - rotate all selected blocks around center.
 */
function onRotateHandleMove(ctx: Context, handleId: EntityId): void {
  const transformBoxes = transformBoxQuery.current(ctx);
  if (transformBoxes.length === 0) {
    console.warn("No transform box found for rotation");
    return;
  }

  const boxId = transformBoxes[0];
  const boxBlock = Block.read(ctx, boxId);
  const boxCenter = Block.getCenter(ctx, boxId);

  const handleBlock = Block.read(ctx, handleId);
  const handleCenter: Vec2 = [
    handleBlock.position[0] + handleBlock.size[0] / 2,
    handleBlock.position[1] + handleBlock.size[1] / 2,
  ];

  // Calculate angle from center to handle
  const angleHandle = Math.atan2(
    handleCenter[1] - boxCenter[1],
    handleCenter[0] - boxCenter[0]
  );

  const handle = TransformHandle.read(ctx, handleId);
  const handleStartAngle =
    Math.atan2(
      boxBlock.size[1] * handle.vectorY,
      boxBlock.size[0] * handle.vectorX
    ) + boxBlock.rotateZ;

  const delta = angleHandle - handleStartAngle;

  // Update all selected blocks
  for (const blockId of selectedBlocksQuery.current(ctx)) {
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    // Update rotation
    block.rotateZ = (blockStart.rotateZ + delta) % (2 * Math.PI);

    // Rotate position around box center
    const startCenter: Vec2 = [
      blockStart.position[0] + blockStart.size[0] / 2,
      blockStart.position[1] + blockStart.size[1] / 2,
    ];

    const r = Math.hypot(
      startCenter[1] - boxCenter[1],
      startCenter[0] - boxCenter[0]
    );
    const angle =
      Math.atan2(startCenter[1] - boxCenter[1], startCenter[0] - boxCenter[0]) +
      delta;

    block.position = [
      boxCenter[0] + Math.cos(angle) * r - block.size[0] / 2,
      boxCenter[1] + Math.sin(angle) * r - block.size[1] / 2,
    ];
  }
}

/**
 * Handle scale/stretch handle movement - scale all selected blocks.
 */
function onScaleHandleMove(
  ctx: Context,
  handleId: EntityId,
  maintainAspectRatio: boolean
): void {
  const transformBoxes = transformBoxQuery.current(ctx);
  if (transformBoxes.length === 0) {
    console.warn("No transform box found for scaling");
    return;
  }

  const boxId = transformBoxes[0];
  const boxStart = DragStart.read(ctx, boxId);
  const boxBlock = Block.read(ctx, boxId);

  const handle = TransformHandle.read(ctx, handleId);
  const handleBlock = Block.read(ctx, handleId);

  // Calculate new box dimensions based on handle position
  const handleCenter: Vec2 = [
    handleBlock.position[0] + handleBlock.size[0] / 2,
    handleBlock.position[1] + handleBlock.size[1] / 2,
  ];

  // Calculate opposite corner position (fixed point)
  const boxCenter = Block.getCenter(ctx, boxId);
  const oppositeCorner: Vec2 = [
    boxCenter[0] - (handleCenter[0] - boxCenter[0]),
    boxCenter[1] - (handleCenter[1] - boxCenter[1]),
  ];

  // Calculate new dimensions
  let newWidth = Math.abs(handleCenter[0] - oppositeCorner[0]);
  let newHeight = Math.abs(handleCenter[1] - oppositeCorner[1]);

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

  // Calculate new box position (maintain center)
  const newBoxLeft =
    boxCenter[0] - (boxCenter[0] - boxStart.position[0]) * scaleX;
  const newBoxTop =
    boxCenter[1] - (boxCenter[1] - boxStart.position[1]) * scaleY;

  // Update all selected blocks
  for (const blockId of selectedBlocksQuery.current(ctx)) {
    const blockStart = DragStart.read(ctx, blockId);
    const block = Block.write(ctx, blockId);

    // Scale position relative to box
    block.position = [
      (blockStart.position[0] - boxStart.position[0]) * scaleX + newBoxLeft,
      (blockStart.position[1] - boxStart.position[1]) * scaleY + newBoxTop,
    ];

    // Scale size
    block.size = [blockStart.size[0] * scaleX, blockStart.size[1] * scaleY];
  }
}

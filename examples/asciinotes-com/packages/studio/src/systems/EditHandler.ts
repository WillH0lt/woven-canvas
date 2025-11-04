import type { Entity } from '@lastolivegames/becsy';
import { ScrollDirection } from '@prisma/client';

import * as comps from '../components/index.js';
import { SNAP_RANGE } from '../constants.js';
import { PointerAction, SnapLineKind, TransformHandleKind } from '../types.js';
import BaseSystem from './Base.js';
import {
  aabbsIntersect,
  addComponent,
  createSnapLine,
  createTransformHandles,
  deleteEntity,
  getAabb,
  getCenter,
  getOppositeRailKind,
  getOppositeTransformHandleKind,
  getTransformHandleVector,
  intersectPoint,
  removeComponent,
  rotatePoint,
  setTransformBoxVisibility,
  setVisibility,
  updateSnapLine,
  updateTransformBox,
  updateTransformBoxHandles,
} from './common.js';
import SelectionHandler from './SelectionHandler.js';

interface BlockDef {
  top: number;
  bottom: number;
  left: number;
  right: number;
  x: number;
  y: number;
}

interface SnapDef {
  kind: SnapLineKind;
  start: [number, number];
  end: [number, number];
  rotateZ: number;
  length: number;
  shift: number;
}

// enum Direction {
//   Horizontal = 'horizontal',
//   Vertical = 'vertical',
// }

const EPS = 1;

// the best snaps are the ones that are the shortest
// if there's a tie, use the snap with the shortest shift.
// if there's still a tie, use all the snaps
function getBestSnaps(snaps: SnapDef[]): SnapDef[] {
  let bestSnaps: SnapDef[] = [];
  for (const snap of snaps) {
    if (bestSnaps.length === 0) {
      bestSnaps.push(snap);
    } else if (snap.length + EPS < bestSnaps[0].length) {
      bestSnaps = [snap];
    } else if (Math.abs(snap.length - bestSnaps[0].length) < EPS) {
      if (Math.abs(snap.shift) + EPS < Math.abs(bestSnaps[0].shift)) {
        bestSnaps = [snap];
      } else if (Math.abs(Math.abs(snap.shift) - Math.abs(bestSnaps[0].shift)) < EPS) {
        bestSnaps.push(snap);
      }
    }
  }

  return bestSnaps;
}

// candidate snaps are the snap lines that are within the snap range
function getCandidateSnaps(
  dragged: BlockDef,
  block: BlockDef,
  snapLineKinds: SnapLineKind[],
): { horizontal: SnapDef[]; vertical: SnapDef[] } {
  const verticalSnaps: SnapDef[] = [];
  const horizontalSnaps: SnapDef[] = [];

  for (const snapLineKind of snapLineKinds) {
    const [keyDragged, keyBlock] = snapLineKind.split('-') as [keyof BlockDef, keyof BlockDef];
    const shift = block[keyBlock] - dragged[keyDragged];
    if (Math.abs(shift) < SNAP_RANGE) {
      const start: [number, number] = [0, 0];
      const end: [number, number] = [0, 0];
      if (['top', 'bottom', 'x'].includes(keyBlock)) {
        start[0] = Math.min(dragged.left, block.left);
        end[0] = Math.max(dragged.right, block.right);

        start[1] = block[keyBlock];
        end[1] = block[keyBlock];

        verticalSnaps.push({
          kind: snapLineKind,
          start,
          end,
          rotateZ: 0,
          length: Math.abs(start[0] - end[0]),
          shift,
        });
      } else if (['left', 'right', 'y'].includes(keyBlock)) {
        start[1] = Math.min(dragged.top, block.top);
        end[1] = Math.max(dragged.bottom, block.bottom);

        start[0] = block[keyBlock];
        end[0] = block[keyBlock];

        horizontalSnaps.push({
          kind: snapLineKind,
          start,
          end,
          rotateZ: 0,
          length: Math.abs(start[1] - end[1]),
          shift,
        });
      }
    }
  }

  return { horizontal: horizontalSnaps, vertical: verticalSnaps };
}

class EditHandler extends BaseSystem {
  private readonly input = this.singleton.read(comps.Input);

  private readonly page = this.singleton.read(comps.Page);

  private readonly draggables = this.query((q) =>
    q.current.with(comps.Part).and.with(comps.Draggable),
  );

  private readonly dragged = this.query(
    (q) => q.current.and.added.and.removed.with(comps.Part).write.and.with(comps.Dragged).write,
  );

  private readonly edited = this.query(
    (q) => q.current.with(comps.Part).write.and.with(comps.Edited).write,
  );

  private readonly typed = this.query(
    (q) => q.current.with(comps.Part).write.and.with(comps.Typed).write,
  );

  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Block)
        .and.with(comps.Part)
        .and.using(comps.Typed, comps.Aabb, comps.Group).read,
  );

  private readonly selectedBlocks = this.query(
    (q) =>
      q.current.and.added.and.removed
        .with(comps.Block)
        .and.with(comps.Part)
        .and.with(comps.Selected).write,
  );

  private readonly snapLines = this.query(
    (q) => q.current.with(comps.Part).write.and.with(comps.SnapLine).write,
  );

  private readonly transformHandles = this.query(
    (q) =>
      q.current
        .with(comps.TransformHandle)
        .write.and.with(comps.Part)
        .write.and.using(comps.Draggable, comps.Aabb, comps.Inactive).write,
  );

  private readonly rails = this.query((q) => q.current.with(comps.Rail));

  private readonly transformBoxes = this.query(
    (q) =>
      q.added.and.current.and.removed
        .with(comps.TransformBox)
        .write.and.with(comps.Part)
        .write.and.using(comps.Draggable, comps.Hoverable).write,
  );

  private readonly cursors = this.query((q) => q.current.with(comps.Cursor).write);

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(SelectionHandler));
  }

  public execute(): void {
    // ========================================
    // Transform Handles

    // remove transform handles if transform box is removed
    if (this.transformBoxes.removed.length) {
      this.accessRecentlyDeletedData(true);
    }
    for (const transformBoxEntity of this.transformBoxes.removed) {
      const transformBox = transformBoxEntity.read(comps.TransformBox);
      for (const transformHandleEntity of transformBox.handles) {
        deleteEntity(transformHandleEntity);
      }
    }

    // create transform handles for each transform box
    for (const transformBoxEntity of this.transformBoxes.added) {
      const handles = createTransformHandles(this, transformBoxEntity, this.selectedBlocks.current);
      if (!this.input.pointerDown) {
        setVisibility(handles, true);
      }
    }

    // ========================================
    // transform box and handle visibility

    // hide transform box/handles when pointer down
    if (this.input.pointerDownTrigger) {
      if (this.transformBoxes.current.length) {
        setTransformBoxVisibility(this.transformBoxes.current[0], false);
      }

      for (const editedEntity of this.edited.current) {
        removeComponent(editedEntity, comps.Edited);
      }
    }

    // show transform box/handles when pointer up
    if (this.input.pointerUpTrigger && this.typed.current.length === 0) {
      if (this.transformBoxes.current.length && this.selectedBlocks.current.length) {
        const transformBoxEntity = this.transformBoxes.current[0];

        setTransformBoxVisibility(transformBoxEntity, true);
        updateTransformBox(transformBoxEntity, this.selectedBlocks.current);
      }

      if (this.selectedBlocks.current.length === 1) {
        addComponent(this.selectedBlocks.current[0], comps.Edited);
      }
    }

    // ========================================
    // Rail visibility

    if (this.dragged.added.length) {
      setVisibility(this.rails.current, true);
    }
    if (this.dragged.removed.length) {
      if (this.dragged.current.length === 0) {
        setVisibility(this.rails.current, false);
      }
    }

    // ========================================
    // Dragging

    // start dragging if pointer down on draggable
    if (
      this.input.dragStartTrigger &&
      !this.input.dragStopTrigger &&
      PointerAction.Interact === this.input.pointerAction
    ) {
      const intersected = intersectPoint(
        [this.input.pointerDownLocation[0], this.input.pointerDownLocation[1]],
        this.draggables.current,
      );

      if (intersected && !intersected.has(comps.Dragged)) {
        const intersectedPart = intersected.read(comps.Part);
        intersected.add(comps.Dragged, {
          grabOffset: [
            this.input.pointerDownLocation[0] - intersectedPart.left,
            this.input.pointerDownLocation[1] - intersectedPart.top,
          ],
          startLeft: intersectedPart.left,
          startTop: intersectedPart.top,
        });
      }

      // hide the selection box if scaling since contents can change size
      if (intersected?.has(comps.TransformHandle) ?? false) {
        const transformBoxEntity = intersected?.read(comps.TransformHandle).transformBox;
        const transformBoxPart = transformBoxEntity?.write(comps.Part);
        if (transformBoxPart) {
          transformBoxPart.opacity = 0;
        }
      }
      // const handleKind = intersected?.read(comps.TransformHandle)
      // if (intersected && intersected.has
    }

    // handle drag stop
    if (this.input.dragStopTrigger) {
      for (const draggedEntity of this.dragged.current) {
        draggedEntity.remove(comps.Dragged);
        this.createSnapshot();
      }
      for (const snapLineEntity of this.snapLines.current) {
        deleteEntity(snapLineEntity);
      }

      // update scale handles when dragging is stopped
      if (this.selectedBlocks.current.length) {
        for (const transformBoxEntity of this.transformBoxes.current) {
          updateTransformBox(transformBoxEntity, this.selectedBlocks.current);
          const { handles } = transformBoxEntity.read(comps.TransformBox);
          updateTransformBoxHandles(transformBoxEntity, handles, this.selectedBlocks.current);
        }
      }
    }

    // remove snap lines if mod or shift is pressed
    if (this.input.modDownTrigger) {
      for (const snapLineEntity of this.snapLines.current) {
        deleteEntity(snapLineEntity);
      }
    }

    // update dragged parts
    for (const draggedEntity of this.dragged.current) {
      if (!draggedEntity.has(comps.Dragged)) continue;

      if (draggedEntity.has(comps.TransformHandle)) {
        const handle = draggedEntity.read(comps.TransformHandle);
        if (handle.kind.toString().includes('rotate')) {
          this.handleRotate(draggedEntity);
        } else {
          this.handleScale(draggedEntity);
        }
      } else if (draggedEntity.has(comps.Rail)) {
        this.handleRailDrag(draggedEntity);
      } else {
        this.handleTranslate(draggedEntity);
      }
    }
  }

  private handleTranslate(draggedEntity: Entity): void {
    const { grabOffset, startLeft, startTop } = draggedEntity.read(comps.Dragged);
    const grabLeft = this.input.pointer[0] - grabOffset[0];
    const grabTop = this.input.pointer[1] - grabOffset[1];

    let draggedPart = draggedEntity.write(comps.Part);
    let dx = grabLeft - draggedPart.left;
    let dy = grabTop - draggedPart.top;

    // contrain to one axis if shift is pressed
    if (this.input.shiftDown) {
      if (Math.abs(grabLeft - startLeft) > Math.abs(grabTop - startTop)) {
        dy = startTop - draggedPart.top;
      } else {
        dx = startLeft - draggedPart.left;
      }
    }

    draggedPart.left += dx;
    draggedPart.top += dy;

    let [snapShiftX, snapShiftY] = [0, 0];
    if (!this.input.modDown && Math.abs(draggedPart.rotateZ % (Math.PI / 2)) < 1e-6) {
      [snapShiftX, snapShiftY] = this.updateSnapLines(draggedEntity, Object.values(SnapLineKind));
    }
    draggedPart = draggedEntity.write(comps.Part);
    draggedPart.left += snapShiftX;
    draggedPart.top += snapShiftY;

    // move selected blocks
    if (draggedEntity.has(comps.TransformBox)) {
      for (const blockEntity of this.selectedBlocks.current) {
        const blockPart = blockEntity.write(comps.Part);
        blockPart.left += dx + snapShiftX;
        blockPart.top += dy + snapShiftY;
      }
    }
  }

  private handleScale(draggedTransformHandle: Entity): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found');
      return;
    }
    const boxEntity = this.transformBoxes.current[0];
    const boxRotateZ = boxEntity.read(comps.Part).rotateZ;

    const transformBox = boxEntity.read(comps.TransformBox);
    const boxStartLeft = transformBox.startLeft;
    const boxStartTop = transformBox.startTop;
    const boxStartWidth = transformBox.startWidth;
    const boxStartHeight = transformBox.startHeight;

    const aspectRatio = boxStartWidth / boxStartHeight;

    // get the position of the opposite corner of the transform box
    const handleKind = draggedTransformHandle.read(comps.TransformHandle).kind;
    const oppositeKind = getOppositeTransformHandleKind(handleKind);
    const oppositeHandle = boxEntity
      .read(comps.TransformBox)
      .handles.find((h) => h.read(comps.TransformHandle).kind === oppositeKind);
    if (!oppositeHandle) {
      console.error('No opposite handle found');
      return;
    }

    const oppositeCenter = getCenter(oppositeHandle);

    let difference: [number, number] = [
      this.input.pointer[0] - oppositeCenter[0],
      this.input.pointer[1] - oppositeCenter[1],
    ];
    difference = rotatePoint(difference, [0, 0], -boxRotateZ);

    let boxEndWidth = Math.max(Math.abs(difference[0]), 10);
    let boxEndHeight = Math.max(Math.abs(difference[1]), 10);

    const isStretchingX = [
      TransformHandleKind.LeftStretch,
      TransformHandleKind.RightStretch,
    ].includes(handleKind);
    const isStretchingY = [
      TransformHandleKind.TopStretch,
      TransformHandleKind.BottomStretch,
    ].includes(handleKind);

    let aspectLocked = true;

    if (this.selectedBlocks.current.length === 1) {
      const blockPart = this.selectedBlocks.current[0].read(comps.Part);
      aspectLocked = blockPart.aspectLocked;
    }

    if (isStretchingX) {
      boxEndHeight = boxStartHeight;
    } else if (isStretchingY) {
      boxEndWidth = boxStartWidth;
    } else if (aspectLocked) {
      const newAspectRatio = boxEndWidth / boxEndHeight;
      if (newAspectRatio > aspectRatio) {
        boxEndHeight = boxEndWidth / aspectRatio;
      } else {
        boxEndWidth = boxEndHeight * aspectRatio;
      }
    } else {
      const isChangingHeight = [
        TransformHandleKind.TopScale,
        TransformHandleKind.BottomScale,
      ].includes(handleKind);
      const isChangingWidth = [
        TransformHandleKind.LeftScale,
        TransformHandleKind.RightScale,
      ].includes(handleKind);
      if (isChangingHeight) {
        boxEndWidth = boxStartWidth;
      } else if (isChangingWidth) {
        boxEndHeight = boxStartHeight;
      }
    }

    let handleVec = getTransformHandleVector(handleKind);
    handleVec[0] *= boxEndWidth;
    handleVec[1] *= boxEndHeight;

    handleVec = rotatePoint(handleVec, [0, 0], boxRotateZ);
    handleVec[0] += oppositeCenter[0];
    handleVec[1] += oppositeCenter[1];

    const newBoxCenter = [
      (oppositeCenter[0] + handleVec[0]) / 2,
      (oppositeCenter[1] + handleVec[1]) / 2,
    ];

    const boxEndLeft = newBoxCenter[0] - boxEndWidth / 2;
    const boxEndTop = newBoxCenter[1] - boxEndHeight / 2;

    const boxPart = boxEntity.write(comps.Part);
    boxPart.left = boxEndLeft;
    boxPart.top = boxEndTop;
    boxPart.width = boxEndWidth;
    boxPart.height = boxEndHeight;

    // TODO scale snapping

    for (const blockEntity of this.selectedBlocks.current) {
      const selected = blockEntity.read(comps.Selected);

      const blockPart = blockEntity.write(comps.Part);

      blockPart.left =
        (selected.startLeft - boxStartLeft) * (boxEndWidth / boxStartWidth) + boxEndLeft;
      blockPart.top =
        (selected.startTop - boxStartTop) * (boxEndHeight / boxStartHeight) + boxEndTop;

      if (!isStretchingY) {
        blockPart.width = selected.startWidth * (boxEndWidth / boxStartWidth);
      }
      if (!isStretchingX) {
        blockPart.height = selected.startHeight * (boxEndHeight / boxStartHeight);
        blockPart.fontSize = selected.startFontSize * (boxEndHeight / boxStartHeight);
      }
      if (isStretchingY || isStretchingX) {
        blockPart.stretched = true;
      }
    }
  }

  private handleRotate(draggedTransformHandle: Entity): void {
    if (!this.transformBoxes.current.length) {
      console.error('No transform box found');
      return;
    }
    const boxEntity = this.transformBoxes.current[0];
    const boxCenter = getCenter(boxEntity);
    const handleCenter = getCenter(draggedTransformHandle);

    const angleHandle = Math.atan2(handleCenter[1] - boxCenter[1], handleCenter[0] - boxCenter[0]);

    const anglePointer = Math.atan2(
      this.input.pointer[1] - boxCenter[1],
      this.input.pointer[0] - boxCenter[0],
    );

    let delta = anglePointer - angleHandle;

    const { rotateZ } = boxEntity.read(comps.Part);
    if (!this.input.modDown) {
      const shift = this.updateRotationSnapLines(rotateZ + delta, boxEntity);
      delta += shift;
    }

    boxEntity.write(comps.Part).rotateZ = (rotateZ + delta) % (2 * Math.PI);

    const rotatedParts = [...this.selectedBlocks.current, draggedTransformHandle];
    for (const blockEntity of rotatedParts) {
      const blockPart = blockEntity.write(comps.Part);
      const blockCenter = getCenter(blockEntity);
      const angle = Math.atan2(blockCenter[1] - boxCenter[1], blockCenter[0] - boxCenter[0]);
      const r = Math.hypot(blockCenter[1] - boxCenter[1], blockCenter[0] - boxCenter[0]);

      blockPart.left = boxCenter[0] + Math.cos(angle + delta) * r - blockPart.width / 2;
      blockPart.top = boxCenter[1] + Math.sin(angle + delta) * r - blockPart.height / 2;
      blockPart.rotateZ = (blockPart.rotateZ + delta) % (2 * Math.PI);
    }

    this.cursors.current[0].write(comps.Cursor);
  }

  private updateRotationSnapLines(angle: number, boxEntity: Entity): number {
    const { value: aabb } = boxEntity.read(comps.Aabb);

    const snapInterval = Math.PI / 4;
    const snapRange = Math.PI / 16;

    let snap: SnapDef | null = null;
    const r = Math.abs(angle) % snapInterval;
    if (r < snapRange / 2 || r > snapInterval - snapRange / 2) {
      const newAngle = Math.round(angle / snapInterval) * snapInterval;
      const length = 50 + Math.hypot(aabb[2] - aabb[0], aabb[3] - aabb[1]);

      const center = getCenter(boxEntity);
      const start: [number, number] = [center[0] - length / 2, center[1]];
      const end: [number, number] = [center[0] + length / 2, center[1]];

      snap = {
        kind: SnapLineKind.Rotate,
        start,
        end,
        length,
        rotateZ: newAngle,
        shift: newAngle - angle,
      };
    }

    if (snap !== null) {
      const snapLine = this.snapLines.current.find(
        (e) => e.read(comps.SnapLine).kind === snap.kind,
      );

      if (snapLine) {
        updateSnapLine(snapLine, snap.start, snap.end, snap.rotateZ);
      } else {
        createSnapLine(this, snap.kind, snap.start, snap.end, snap.rotateZ);
      }
    }

    // remove snap lines that are no longer used
    for (const snapLineEntity of this.snapLines.current) {
      const kind = snapLineEntity.read(comps.SnapLine).kind;
      if (snap?.kind === kind) continue;
      deleteEntity(snapLineEntity);
    }

    return snap?.shift ?? 0;
  }

  // private updateScaleSnapLines(
  //   boxEntity: Entity,
  //   handleCenter: [number, number],
  //   oppositeSide: [number, number],
  // ): [number, number] {
  //   let scaleSnapeLines = [];
  //   // only snap for the sides we're actually moving
  //   if (Math.abs(handleCenter[0] - oppositeSide[0]) < EPS) {
  //     const side = handleCenter[1] > oppositeSide[1] ? 'bottom' : 'top';
  //     scaleSnapeLines = Object.values(SnapLineKind).filter((s) => side === s.split('-')[0]);
  //   } else if (Math.abs(handleCenter[1] - oppositeSide[1]) < EPS) {
  //     const side = handleCenter[0] > oppositeSide[0] ? 'right' : 'left';
  //     scaleSnapeLines = Object.values(SnapLineKind).filter((s) => side === s.split('-')[0]);
  //   } else {
  //     if (handleCenter[0] < oppositeSide[0]) {
  //       scaleSnapeLines.push(SnapLineKind.LeftRight, SnapLineKind.LeftLeft);
  //     } else {
  //       scaleSnapeLines.push(SnapLineKind.RightRight, SnapLineKind.RightLeft);
  //     }
  //     if (handleCenter[1] < oppositeSide[1]) {
  //       scaleSnapeLines.push(SnapLineKind.TopBottom, SnapLineKind.TopTop);
  //     } else {
  //       scaleSnapeLines.push(SnapLineKind.BottomBottom, SnapLineKind.BottomTop);
  //     }
  //   }

  //   const snapShift = this.updateSnapLines(boxEntity, scaleSnapeLines, 1);

  //   // the shift has to be flipped if dragging top vs bottom or left vs right
  //   snapShift[0] *= handleCenter[0] < oppositeSide[0] ? 1 : -1;
  //   snapShift[1] *= handleCenter[1] < oppositeSide[1] ? 1 : -1;

  //   return snapShift;
  // }

  private updateSnapLines(
    draggedEntity: Entity,
    snapLineKinds: SnapLineKind[],
    maxSnapsLines = Infinity,
  ): [number, number] {
    const viewport = this.resources.viewport;
    if (!viewport) {
      console.error('No viewport found');
      return [0, 0];
    }

    const aabb = getAabb(draggedEntity);
    const dragged: BlockDef = {
      left: aabb[0],
      top: aabb[1],
      right: aabb[2],
      bottom: aabb[3],
      x: (aabb[1] + aabb[3]) / 2,
      y: (aabb[0] + aabb[2]) / 2,
    };

    const viewportAabb = [viewport.left, viewport.top, viewport.right, viewport.bottom] as [
      number,
      number,
      number,
      number,
    ];

    // find the candidate snap lines
    const verticalSnaps: SnapDef[] = [];
    const horizontalSnaps: SnapDef[] = [];
    for (const blockEntity of this.blocks.current) {
      if (blockEntity.isSame(draggedEntity) || blockEntity.has(comps.Selected)) continue;

      const { value: blockAabb } = blockEntity.read(comps.Aabb);

      if (!aabbsIntersect(blockAabb, viewportAabb)) continue;

      const block: BlockDef = {
        left: blockAabb[0],
        top: blockAabb[1],
        right: blockAabb[2],
        bottom: blockAabb[3],
        x: (blockAabb[1] + blockAabb[3]) / 2,
        y: (blockAabb[0] + blockAabb[2]) / 2,
      };

      const { horizontal, vertical } = getCandidateSnaps(dragged, block, snapLineKinds);
      verticalSnaps.push(...vertical);
      horizontalSnaps.push(...horizontal);
    }

    // also test the rails for candidate snap lines
    for (const railEntity of this.rails.current) {
      const railPart = railEntity.read(comps.Part);
      const block: BlockDef = {
        left: railPart.left,
        top: railPart.top,
        right: railPart.left + railPart.width,
        bottom: railPart.top + railPart.height,
        y: (railPart.left + (railPart.left + railPart.width)) / 2,
        x: (railPart.top + (railPart.top + railPart.height)) / 2,
      };

      const snapKinds: SnapLineKind[] = [];
      if (this.page.scrollDirection === ScrollDirection.Horizontal) {
        snapKinds.push(SnapLineKind.TopX, SnapLineKind.BottomX, SnapLineKind.XX);
      } else {
        snapKinds.push(SnapLineKind.LeftY, SnapLineKind.RightY, SnapLineKind.YY);
      }

      const { horizontal, vertical } = getCandidateSnaps(dragged, block, snapKinds);
      verticalSnaps.push(...vertical);
      horizontalSnaps.push(...horizontal);
    }

    // find the best snap lines, i.e. the shortest ones both in x and y
    const bestVerticalSnaps = getBestSnaps(verticalSnaps);
    const bestHorizontalSnaps = getBestSnaps(horizontalSnaps);

    // trim by maximum number of snap lines
    bestVerticalSnaps.splice(maxSnapsLines);
    bestHorizontalSnaps.splice(maxSnapsLines - bestVerticalSnaps.length);

    // get the shift in x and y to snap to the best snap lines
    const shift: [number, number] = [0, 0];
    if (bestHorizontalSnaps.length) {
      shift[0] = bestHorizontalSnaps[0].shift;
    }
    if (bestVerticalSnaps.length) {
      shift[1] = bestVerticalSnaps[0].shift;
    }

    // create or update the best snap lines
    const bestSnaps = [...bestHorizontalSnaps, ...bestVerticalSnaps];
    for (const bestSnap of bestSnaps) {
      const snapLine = this.snapLines.current.find(
        (e) => e.read(comps.SnapLine).kind === bestSnap.kind,
      );

      if (snapLine) {
        updateSnapLine(snapLine, bestSnap.start, bestSnap.end, bestSnap.rotateZ);
      } else {
        createSnapLine(this, bestSnap.kind, bestSnap.start, bestSnap.end, bestSnap.rotateZ);
      }
    }

    // remove snap lines that are no longer used
    for (const snapLineEntity of this.snapLines.current) {
      const kind = snapLineEntity.read(comps.SnapLine).kind;
      if (bestSnaps.find((s) => s.kind === kind)) continue;
      deleteEntity(snapLineEntity);
    }

    return shift;
  }

  private handleRailDrag(draggedEntity: Entity): void {
    const { kind, rail } = draggedEntity.read(comps.RailHandle);
    const oppositeKind = getOppositeRailKind(kind);
    const oppositeHandle = this.rails.current.find((h) => h.read(comps.Rail).kind === oppositeKind);
    if (!oppositeHandle) {
      console.error('No opposite handle found');
      return;
    }

    if (this.page.scrollDirection === ScrollDirection.Vertical) {
      const handlePart = draggedEntity.write(comps.Part);
      handlePart.left = this.input.pointer[0] - handlePart.width / 2;

      const railPart = rail.write(comps.Part);
      railPart.left = this.input.pointer[0];

      const oppositeHandlePart = oppositeHandle.write(comps.Part);
      oppositeHandlePart.left = -1 * this.input.pointer[0] - oppositeHandlePart.width / 2;

      const oppositeRail = oppositeHandle.read(comps.RailHandle).rail;
      oppositeRail.write(comps.Part).left = -1 * this.input.pointer[0];
    } else {
      const handlePart = draggedEntity.write(comps.Part);
      handlePart.top = this.input.pointer[1] - handlePart.height / 2;

      const railPart = rail.write(comps.Part);
      railPart.top = this.input.pointer[1];

      const oppositeHandlePart = oppositeHandle.write(comps.Part);
      oppositeHandlePart.top = -1 * this.input.pointer[1] - oppositeHandlePart.height / 2;

      const oppositeRail = oppositeHandle.read(comps.RailHandle).rail;
      oppositeRail.write(comps.Part).top = -1 * this.input.pointer[1];
    }

    // for (const blockEntity of this.blocks.current) {
    //   const center = getCenter(blockEntity);
    //   const blockPart = blockEntity.write(comps.Part);

    //   blockPart.width *= endWidth / startWidth;
    //   blockPart.height *= endWidth / startWidth;
    //   blockPart.fontSize *= endWidth / startWidth;

    //   blockPart.left = center[0] * (endWidth / startWidth) - blockPart.width / 2;
    //   blockPart.top = center[1] * (endWidth / startWidth) - blockPart.height / 2;
    // }

    // this.pages.current[0].write(comps.Page).minWidth = endWidth;
  }
}

export default EditHandler;

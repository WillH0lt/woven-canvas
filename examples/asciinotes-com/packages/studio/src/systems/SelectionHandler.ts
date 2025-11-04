import { v4 as uuid } from 'uuid';

import * as comps from '../components/index.js';
import { setCursor } from '../cursors.js';
import { CursorKind, PointerAction, Tag } from '../types.js';
import BaseSystem from './Base.js';
import {
  addComponent,
  createBlock,
  createSelectionBox,
  createTransformBox,
  deleteEntity,
  deleteUnusedGroups,
  getGroupedParts,
  getNextRank,
  getText,
  intersectPoint,
  intersectRect,
  isTypeable,
  removeComponent,
} from './common.js';
import PartHandler from './PartHandler.js';

class SelectionHandler extends BaseSystem {
  private readonly input = this.singleton.read(comps.Input);

  private readonly cursor = this.singleton.read(comps.Cursor);

  private readonly cursors = this.query(
    (q) => q.changed.and.current.with(comps.Cursor).write.trackWrites,
  );

  private readonly inputSettings = this.singleton.read(comps.InputSettings);

  private readonly inputSettingsQuery = this.query(
    (q) => q.addedOrChanged.with(comps.InputSettings).trackWrites,
  );

  private readonly selectableParts = this.query((q) =>
    q.current.with(comps.Part).and.without(comps.Inactive),
  );

  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Block)
        .and.with(comps.Part)
        .using(
          comps.Block,
          comps.Part,
          comps.Aabb,
          comps.Edited,
          comps.Hoverable,
          comps.Hovered,
          comps.Typed,
          comps.Transform,
        ).write,
  );

  private readonly selectableBlocks = this.query((q) =>
    q.current.with(comps.Block).and.with(comps.Part).and.without(comps.Inactive),
  );

  private readonly hoverableParts = this.query((q) =>
    q.current.with(comps.Part).and.with(comps.Hoverable).and.without(comps.Inactive),
  );

  private readonly hoveredParts = this.query(
    (q) => q.current.added.removed.with(comps.Part).and.with(comps.Hovered).write,
  );

  private readonly dragged = this.query(
    (q) => q.added.and.removed.and.current.with(comps.Part).write.and.with(comps.Dragged).write,
  );

  private readonly selectedBlocks = this.query(
    (q) =>
      q.current.and.added.and.removed.and.changed
        .with(comps.Block)
        .and.with(comps.Part)
        .trackWrites.and.with(comps.Selected).write,
  );

  // @ts-ignore
  private readonly groups = this.query((q) => q.current.with(comps.Group));

  private readonly selectionBoxes = this.query(
    (q) => q.current.with(comps.Part).write.and.with(comps.SelectionBox).write,
  );

  private readonly transformBoxes = this.query(
    (q) =>
      q.current.with(comps.Part).write.and.with(comps.TransformBox).write.using(comps.Draggable)
        .write,
  );

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(PartHandler));
  }

  public execute(): void {
    // ========================================
    // Selection box

    // create selection box when pointer is down
    if (
      this.input.pointerDownTrigger &&
      this.input.pointerAction === PointerAction.Interact &&
      !this.selectionBoxes.current.length
    ) {
      const intersected = intersectPoint(this.input.pointer, this.selectableParts.current);
      if (!intersected) {
        createSelectionBox(this, this.input.pointer);
      }
    }

    // update selection box based on pointer position and select blocks
    if (this.selectionBoxes.current.length) {
      const selectionBoxEntity = this.selectionBoxes.current[0];
      const { start } = selectionBoxEntity.read(comps.SelectionBox);

      const part = this.selectionBoxes.current[0].write(comps.Part);
      part.left = Math.min(start[0], this.input.pointer[0]);
      part.top = Math.min(start[1], this.input.pointer[1]);
      part.width = Math.abs(start[0] - this.input.pointer[0]);
      part.height = Math.abs(start[1] - this.input.pointer[1]);

      const rect: [number, number, number, number] = [part.top, part.left, part.width, part.height];
      let intersectedBlocks = intersectRect(rect, this.selectableBlocks.current);

      intersectedBlocks = getGroupedParts(intersectedBlocks);

      // remove select from unselected blocks
      for (const blockEntity of this.selectedBlocks.current) {
        if (!intersectedBlocks.includes(blockEntity)) {
          removeComponent(blockEntity, comps.Selected);
        }
      }

      // add selected to selected blocks
      for (const blockEntity of intersectedBlocks) {
        addComponent(blockEntity, comps.Selected);
      }
    }

    // delete selection box when pointer is up
    if (this.input.pointerUpTrigger && this.selectionBoxes.current.length) {
      deleteEntity(this.selectionBoxes.current[0]);
    }

    // delete selected entities when delete key is pressed
    if (this.input.deleteDownTrigger) {
      for (const selectedBlockEntity of this.selectedBlocks.current) {
        if (!selectedBlockEntity.has(comps.Typed)) deleteEntity(selectedBlockEntity);
      }

      deleteUnusedGroups(this.groups.current);
    }

    // ========================================
    // Transform box

    // select block when clicked
    if (
      this.input.pointerDownTrigger &&
      this.input.pointerAction === PointerAction.Interact &&
      !this.cursor.heldBlock
    ) {
      const objects = this.input.shiftDown
        ? this.selectableBlocks.current
        : this.selectableParts.current;

      const intersected = intersectPoint(this.input.pointer, objects);

      if (intersected?.has(comps.Block) ?? false) {
        if (!this.input.shiftDown) {
          for (const seletedBlockEntity of this.selectedBlocks.current) {
            removeComponent(seletedBlockEntity, comps.Selected);
          }
        }

        if (intersected) {
          const partEntities = intersected.has(comps.Typed)
            ? [intersected]
            : getGroupedParts([intersected]);
          for (const partEntity of partEntities) {
            addComponent(partEntity, comps.Selected);
          }
        }
      }
    }

    // click into group with double click
    if (this.input.doubleClickTrigger && this.input.pointerAction === PointerAction.Interact) {
      // const groupSelected = isGroupSelected(this.selectedBlocks.current);

      // if (groupSelected) {
      const intersected = intersectPoint(this.input.pointer, this.selectableBlocks.current);

      for (const seletedBlockEntity of this.selectedBlocks.current) {
        removeComponent(seletedBlockEntity, comps.Selected);
      }

      if (intersected) {
        addComponent(intersected, comps.Selected);
      }
    }

    // ========================================
    // Edited

    // remove 'edited' when block is unselected
    for (const selectedBlocksEntity of this.selectedBlocks.removed) {
      removeComponent(selectedBlocksEntity, comps.Edited);
      removeComponent(selectedBlocksEntity, comps.Typed);
      if (selectedBlocksEntity.alive) {
        const part = selectedBlocksEntity.read(comps.Part);
        if (part.tag === Tag.Text && getText(part.innerHtml).trim() === '') {
          deleteEntity(selectedBlocksEntity);
        }
      }

      this.createSnapshot();
    }

    // add 'typed' when transform box is clicked
    if (this.input.isClickedTrigger && this.selectedBlocks.current.length === 1) {
      const transformBoxEntity = intersectPoint(this.input.pointer, this.transformBoxes.current);
      if (transformBoxEntity) {
        const transformBox = transformBoxEntity.write(comps.TransformBox);
        if (transformBox.pointerHasBeenReleasedAtLeastOnce) {
          const blockEntity = this.selectedBlocks.current[0];
          if (isTypeable(blockEntity)) {
            addComponent(blockEntity, comps.Typed);
            deleteEntity(transformBoxEntity);
          }
        } else {
          transformBox.pointerHasBeenReleasedAtLeastOnce = true;
        }
      }
    }

    // recreate transform box to selected blocks
    if (this.selectedBlocks.added.length || this.selectedBlocks.removed.length) {
      for (const transformBoxEntity of this.transformBoxes.current) {
        deleteEntity(transformBoxEntity);
      }
      if (this.selectedBlocks.current.length) {
        createTransformBox(this, this.selectedBlocks.current, this.input.pointerDown);
      }
    }

    // ========================================
    // Cursor
    for (const cursorEntity of this.cursors.changed) {
      const cursor = cursorEntity.read(comps.Cursor);
      let rotateZ = 0;
      if (this.hoveredParts.current.length) {
        const part = this.hoveredParts.current[0].read(comps.Part);
        rotateZ = part.rotateZ;
      }
      setCursor(cursor.cursorKind, rotateZ, this.inputSettings.actionLeftMouse);
    }

    if (this.inputSettingsQuery.addedOrChanged.length) {
      setCursor(this.cursor.cursorKind, 0, this.inputSettings.actionLeftMouse);
    }

    // remove hovered so it can be recalculated
    for (const hoveredPartEntity of this.hoveredParts.current) {
      if (this.input.pointerDown) continue;
      removeComponent(hoveredPartEntity, comps.Hovered);
    }

    if (!this.cursor.heldBlock && this.input.pointerOver) {
      // check if hovering over a block
      if (!this.input.pointerDown) {
        const hoveredPart = intersectPoint(this.input.pointer, this.hoverableParts.current);
        if (hoveredPart) {
          addComponent(hoveredPart, comps.Hovered);
        }
      }

      // remove cursor when not hovering over a block
      if (this.hoveredParts.removed.length) {
        const cursor = this.cursors.current[0].write(comps.Cursor);
        cursor.cursorKind = CursorKind.Auto;
      }

      // update cursor based on hovered block
      for (const hoveredPartEntity of this.hoveredParts.added) {
        const { cursorKind } = hoveredPartEntity.read(comps.Hoverable);
        const cursor = this.cursors.current[0].write(comps.Cursor);
        cursor.cursorKind = cursorKind;
      }
    }

    // show move cursor when dragging starts
    for (const draggedEntity of this.dragged.added) {
      if (
        draggedEntity.has(comps.Hoverable) &&
        draggedEntity.read(comps.Hoverable).cursorKind === CursorKind.Auto
      ) {
        const cursor = this.cursors.current[0].write(comps.Cursor);
        cursor.cursorKind = CursorKind.Move;
      }
    }

    // remove move cursor when dragging ends
    if (this.dragged.removed.length) {
      const cursor = this.cursors.current[0].write(comps.Cursor);
      cursor.cursorKind = CursorKind.Auto;
    }

    // remove held block when escape key is pressed
    if (this.input.escapeDownTrigger) {
      const cursor = this.cursors.current[0].write(comps.Cursor);
      cursor.heldBlock = null;
      cursor.cursorKind = CursorKind.Auto;
    }

    // place held block
    if (this.input.pointerDownTrigger && this.cursor.heldBlock) {
      for (const selectedBlockEntity of this.selectedBlocks.current) {
        removeComponent(selectedBlockEntity, comps.Selected);
      }

      const nextRank = getNextRank(this.blocks.current);
      const blockEntity = createBlock(
        this,
        {
          ...this.cursor.heldBlock,
          id: uuid(),
          left: this.input.pointer[0] - this.cursor.heldBlock.width / 2,
          top: this.input.pointer[1] - this.cursor.heldBlock.height / 2,
          rank: nextRank.toString(),
        },
        null,
      );
      addComponent(blockEntity, comps.Edited);
      addComponent(blockEntity, comps.Selected);
      if (isTypeable(blockEntity)) {
        addComponent(blockEntity, comps.Typed);
      }

      this.createSnapshot();

      const cursor = this.cursors.current[0].write(comps.Cursor);
      cursor.heldBlock = null;
      cursor.cursorKind = CursorKind.Auto;
    }
  }
}

export default SelectionHandler;

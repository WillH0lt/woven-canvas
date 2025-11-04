import type { Entity } from '@lastolivegames/becsy';
import { co } from '@lastolivegames/becsy';
import isEqual from 'lodash.isequal';

import * as comps from '../components/index.js';
import type { StateSnapshot } from '../types.js';
import BaseSystem from './Base.js';
import {
  deleteEntity,
  duplicateParts,
  getStateDelta,
  readEffect,
  readGroup,
  readPage,
  readPart,
  readTile,
  removeComponent,
  serializeParts,
  updateState,
  waitForPromise,
} from './common.js';

class UndoRedo extends BaseSystem {
  private readonly input = this.singleton.read(comps.Input);

  private readonly clipboard = this.singleton.write(comps.Clipboard);

  private readonly undoRedoState = this.singleton.write(comps.UndoRedoState);

  private readonly siteLimits = this.singleton.read(comps.SiteLimits);

  private readonly pages = this.query((q) => q.current.with(comps.Page).read);

  private readonly snapshots = this.query((q) =>
    q.added.and.current.with(comps.Snapshot).write.orderBy((s) => -s.ordinal),
  );

  private readonly undoStack = this.query((q) =>
    q.current
      .with(comps.Snapshot)
      .with(comps.Undoable)
      .write.orderBy((s) => -s.ordinal),
  );

  private readonly redoStack = this.query((q) =>
    q.current
      .with(comps.Snapshot)
      .with(comps.Redoable)
      .write.orderBy((s) => s.ordinal),
  );

  private readonly effects = this.query((q) => q.current.with(comps.Effect).read);

  private readonly blocks = this.query((q) => q.current.with(comps.Block).using(comps.Part).read);

  private readonly groups = this.query((q) => q.current.with(comps.Group).read);

  private readonly tiles = this.query((q) => q.current.with(comps.Tile));

  private readonly selectedBlocks = this.query((q) =>
    q.current.with(comps.Block).with(comps.Selected),
  );

  // @ts-ignore
  private readonly _all = this.query((q) => q.usingAll.write);

  @co private *undoCoroutine(): Generator {
    this.deselectAll();

    yield co.waitForFrames(2);

    this.undo();
  }

  @co private *redoCoroutine(): Generator {
    this.deselectAll();

    yield co.waitForFrames(2);

    this.redo();
  }

  @co private *saveSnapshot(snapshotEntity: Entity): Generator {
    co.cancelIfCoroutineStarted();

    const state = this.serializeState();

    // remove empty snapshots, can be created last frame and still not assigned a url
    for (const s of this.undoStack.current) {
      if (!s.isSame(snapshotEntity) && s.read(comps.Snapshot).url === '') {
        deleteEntity(s);
      }
    }

    let prevSnapshotEntity = this.undoStack.current.find(
      (s) => !s.isSame(snapshotEntity) && s.read(comps.Snapshot).url !== '',
    );

    if (prevSnapshotEntity) {
      prevSnapshotEntity = prevSnapshotEntity.hold();

      const prevSnapshot = prevSnapshotEntity.read(comps.Snapshot);
      const url = prevSnapshot.url;

      const prevState = (yield* waitForPromise(
        fetch(url).then(async (res) => res.json()),
      )) as StateSnapshot;

      if (isEqual(prevState, state)) {
        snapshotEntity.add(comps.ToBeDeleted);
        return;
      }

      for (const s of this.redoStack.current) {
        deleteEntity(s);
      }
    }

    const blob = new Blob([JSON.stringify(state)], {
      type: 'application/json',
    });
    const blobUrl = URL.createObjectURL(blob);
    const snapshot = snapshotEntity.write(comps.Snapshot);
    snapshot.url = blobUrl;

    this.resources.emitter.emit('snapshot:move-state', blobUrl);
  }

  @co private *moveState(toSnapshotEntity: Entity): Generator {
    const currState = this.serializeState();
    const { url } = toSnapshotEntity.read(comps.Snapshot);

    const nextState = (yield* waitForPromise(
      fetch(url).then(async (res) => res.json()),
    )) as StateSnapshot;

    const stateDelta = getStateDelta(currState, nextState);

    updateState(
      this,
      stateDelta,
      this.groups.current,
      this.blocks.current,
      this.effects.current,
      this.tiles.current,
      this.resources.app,
      this.resources.tileContainer,
    );

    this.resources.emitter.emit('snapshot:move-state', url);

    if (stateDelta.updatedEffects.length) {
      this.resources.emitter.emit('effects:update', stateDelta.updatedEffects);
    }
  }

  @co private *pasteFromClipboard(): Generator {
    if (!this.clipboard.url) return;

    const url = this.clipboard.url;
    const state = (yield* waitForPromise(
      fetch(url).then(async (res) => res.json()),
    )) as StateSnapshot;

    this.deselectAll();

    if (this.blocks.current.length + Object.keys(state.parts).length > this.siteLimits.partsCount) {
      return;
    }

    yield* duplicateParts(
      this,
      Object.values(state.parts),
      Object.values(state.groups),
      Object.values(state.effects),
      this.blocks.current,
      this.groups.current,
      [15, -15],
    );
  }

  @co private *startInnerEditCoroutine(): Generator {
    this.undoRedoState.innerEditStart = this.undoStack.current[0];

    yield;
  }

  @co private *cancelInnerEditCoroutine(): Generator {
    if (!this.undoRedoState.innerEditStart) return;

    for (const s of this.redoStack.current) {
      deleteEntity(s);
    }

    for (let i = 0; i < this.undoStack.current.length; i++) {
      const snapshot = this.undoStack.current[i];
      if (!snapshot.isSame(this.undoRedoState.innerEditStart)) {
        deleteEntity(snapshot);
      } else {
        break;
      }
    }

    yield this.moveState(this.undoRedoState.innerEditStart);

    this.undoRedoState.innerEditStart = null;
    this.undoRedoState.inInnerEdit = false;

    yield;
  }

  @co private *finishInnerEditCoroutine(): Generator {
    if (!this.undoRedoState.innerEditStart) return;

    for (const s of this.redoStack.current) {
      deleteEntity(s);
    }

    for (let i = 0; i < this.undoStack.current.length; i++) {
      const snapshot = this.undoStack.current[i];
      if (!snapshot.isSame(this.undoRedoState.innerEditStart)) {
        deleteEntity(snapshot);
      } else {
        break;
      }
    }

    this.undoRedoState.innerEditStart = null;
    this.undoRedoState.inInnerEdit = false;

    this.createSnapshot();

    yield;
  }

  public initialize(): void {
    this.createSnapshot();

    this.registerEvent('world:start-inner-edit', () => this.startInnerEditCoroutine());
    this.registerEvent('world:finish-inner-edit', () => this.finishInnerEditCoroutine());
    this.registerEvent('world:cancel-inner-edit', () => this.cancelInnerEditCoroutine());
    this.registerEvent('world:undo', () => this.undoCoroutine());
    this.registerEvent('world:redo', () => this.redoCoroutine());
  }

  public execute(): void {
    if (this.snapshots.added.length) {
      this.saveSnapshot(this.snapshots.added[0]);
    }

    // remove duplicate snapshots created by the same action
    if (this.snapshots.added.length > 1) {
      for (let i = 1; i < this.snapshots.added.length; i++) {
        this.snapshots.added[i].add(comps.ToBeDeleted);
      }
    }

    if (
      (this.input.yDownTrigger && this.input.modDown) ||
      (this.input.zDownTrigger && this.input.modDown && this.input.shiftDown)
    ) {
      this.redo();
    } else if (this.input.zDownTrigger && this.input.modDown) {
      this.undo();
    } else if (this.input.xDownTrigger && this.input.modDown) {
      this.cutToClipboard();
    } else if (this.input.cDownTrigger && this.input.modDown) {
      this.copyToClipboard();
    } else if (this.input.vDownTrigger && this.input.modDown) {
      this.pasteFromClipboard();
    }
  }

  private redo(): void {
    if (this.redoStack.current.length) {
      const nextSnapshot = this.redoStack.current[0];
      this.moveState(nextSnapshot);
      nextSnapshot.remove(comps.Redoable);
      nextSnapshot.add(comps.Undoable);
    }
  }

  private undo(): void {
    if (this.undoStack.current.length > 1) {
      const currentSnapshot = this.undoStack.current[0];
      if (!(this.undoRedoState.innerEditStart?.isSame(currentSnapshot) ?? false)) {
        const nextSnapshot = this.undoStack.current[1];
        this.moveState(nextSnapshot);
        this.undoStack.current[0].remove(comps.Undoable);
        this.undoStack.current[0].add(comps.Redoable);
      }
    }
  }

  private deselectAll(): void {
    for (const selectedBlockEntity of this.selectedBlocks.current) {
      removeComponent(selectedBlockEntity, comps.Selected);
    }
  }

  private serializeState(): StateSnapshot {
    const page = readPage(this.pages.current[0]);

    const state: StateSnapshot = {
      page,
      parts: {},
      groups: {},
      effects: {},
      tiles: {},
    };
    for (const blockEntity of this.blocks.current) {
      // if (blockEntity.has(comps.ToBeDeleted)) continue;
      const part = readPart(blockEntity);
      state.parts[part.id] = part;
    }

    for (const groupEntity of this.groups.current) {
      const group = readGroup(groupEntity);
      state.groups[group.id] = group;
    }

    for (const effectEntity of this.effects.current) {
      if (effectEntity.has(comps.ToBeDeleted)) {
        continue;
      }
      const effect = readEffect(effectEntity);
      state.effects[effect.id] = effect;
    }

    for (const tileEntity of this.tiles.current) {
      const tile = readTile(tileEntity);
      if (tile.url === '') continue;
      state.tiles[tile.id] = tile;
    }

    return state;
  }

  private cutToClipboard(): void {
    this.copyToClipboard();
    for (const selectedBlockEntity of this.selectedBlocks.current) {
      deleteEntity(selectedBlockEntity);
    }
    this.createSnapshot();
  }

  private copyToClipboard(): void {
    const state = serializeParts(this.selectedBlocks.current);
    if (!Object.keys(state).length) return;

    const blob = new Blob([JSON.stringify(state)], {
      type: 'application/json',
    });
    const blobUrl = URL.createObjectURL(blob);
    this.clipboard.url = blobUrl;
  }
}

export default UndoRedo;

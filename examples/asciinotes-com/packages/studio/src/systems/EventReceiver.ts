import type { Entity } from '@lastolivegames/becsy';
import { co } from '@lastolivegames/becsy';
import type { Effect, Group, Page, Part } from '@prisma/client';
import { ScrollDirection } from '@prisma/client';
import { LexoRank } from 'lexorank';
import type * as PIXI from 'pixi.js';
import { v4 as uuid } from 'uuid';

import * as comps from '../components/index.js';
import type { Brush, InputSettings, Layer } from '../types.js';
import { CursorKind } from '../types.js';
import BaseSystem from './Base.js';
import {
  addComponent,
  createEffect,
  createGroup,
  deleteEntity,
  deleteGroup,
  deleteUnusedGroups,
  duplicateParts,
  getRankBounds,
  isGroupSelected,
  readEffects,
  readGroups,
  readParts,
  readTiles,
  removeComponent,
  serializeParts,
  sortByRank,
  updateEffect,
} from './common.js';
import EffectHandler from './EffectHandler.js';
import InputReader from './InputReader.js';
import ViewportHandler from './ViewportHandler.js';

class EventReceiver extends BaseSystem {
  // @ts-ignore
  // private readonly cursor = this.singleton.read(comps.Cursor);

  private readonly siteLimits = this.singleton.read(comps.SiteLimits);

  private readonly page = this.singleton.read(comps.Page);

  private readonly viewportScale = this.singleton.read(comps.ViewportScale);

  private readonly cursors = this.query((q) => q.current.with(comps.Cursor).write);

  private readonly brushes = this.query((q) => q.current.with(comps.Brush).write);

  private readonly siteLimitsQuery = this.query((q) => q.current.with(comps.SiteLimits).write);

  private readonly inputSettings = this.query((q) => q.current.with(comps.InputSettings).write);

  private readonly layers = this.query((q) => q.current.with(comps.Layer).write);

  private readonly pages = this.query((q) => q.current.with(comps.Page).write);

  private readonly blocks = this.query(
    (q) =>
      q.current
        .with(comps.Part)
        .and.with(comps.Block)
        .write.using(comps.Hoverable, comps.Selected)
        .write.using(comps.Transform, comps.Aabb).write,
  );

  private readonly parts = this.query(
    (q) => q.added.and.changed.and.removed.with(comps.Part).trackWrites,
  );

  private readonly hoveredParts = this.query((q) =>
    q.added.and.removed.with(comps.Part).and.with(comps.Hovered),
  );

  private readonly selectedParts = this.query((q) =>
    q.added.and.current.and.removed.with(comps.Part).and.with(comps.Selected),
  );

  private readonly draggedParts = this.query((q) =>
    q.added.and.removed.with(comps.Part).and.with(comps.Dragged),
  );

  private readonly editedParts = this.query((q) =>
    q.added.and.removed.with(comps.Part).and.with(comps.Edited),
  );

  private readonly typedParts = this.query((q) =>
    q.added.and.removed.with(comps.Part).and.with(comps.Typed),
  );

  private readonly groups = this.query(
    (q) => q.added.and.changed.and.current.and.removed.with(comps.Group).write.trackWrites,
  );

  private readonly effects = this.query(
    (q) => q.added.and.changed.and.current.and.removed.with(comps.Effect).write.trackWrites,
  );

  private readonly tiles = this.query(
    (q) =>
      q.added.and.changed.and.current.and.removed
        .with(comps.Tile)
        .trackWrites.using(comps.TileSource).read,
  );

  private readonly selectedBlocks = this.query(
    (q) =>
      q.current.with(comps.Block).write.and.with(comps.Part).write.and.with(comps.Selected).write,
  );

  private readonly transformBoxes = this.query(
    (q) =>
      q.current
        .with(comps.TransformBox)
        .write.and.with(comps.Part)
        .write.and.using(comps.Draggable, comps.Hoverable).write,
  );

  public constructor() {
    super();

    this.schedule((s) => s.inAnyOrderWith(InputReader, ViewportHandler, EffectHandler));
  }

  @co private *updateCursorCoroutine(heldBlock: Partial<Part>): Generator {
    const cursor = this.cursors.current[0].write(comps.Cursor);
    cursor.heldBlock = {
      ...heldBlock,
      pageId: this.pages.current[0].read(comps.Page).id,
    } as Part;
    cursor.cursorKind = CursorKind.Crosshair;
    yield;
  }

  @co private *updateBrushCoroutine(payload: Partial<Brush>): Generator {
    const brush = this.brushes.current[0].write(comps.Brush);

    if (payload.kind !== undefined) brush.kind = payload.kind;
    if (payload.size !== undefined) brush.size = payload.size;
    if (payload.red !== undefined) brush.red = payload.red;
    if (payload.green !== undefined) brush.green = payload.green;
    if (payload.blue !== undefined) brush.blue = payload.blue;
    if (payload.alpha !== undefined) brush.alpha = payload.alpha;

    // Object.assign(brush, payload);

    yield;
  }

  @co private *updateSiteLimitsCoroutine(payload: InputSettings): Generator {
    const siteLimits = this.siteLimitsQuery.current[0].write(comps.SiteLimits);

    Object.assign(siteLimits, payload);

    yield;
  }

  @co private *updateInputSettingsCoroutine(payload: InputSettings): Generator {
    const inputSettings = this.inputSettings.current[0].write(comps.InputSettings);

    Object.assign(inputSettings, payload);

    yield;
  }

  @co private *updateLayerCoroutine(payload: Layer): Generator {
    const layerEntity = this.layers.current.find(
      (layer) => layer.read(comps.Layer).kind === payload.kind,
    );

    if (!layerEntity) {
      console.warn(`Layer with kind ${payload.kind} not found`);
      return;
    }

    const layer = layerEntity.write(comps.Layer);

    Object.assign(layer, payload);

    yield;
  }

  @co private *updatePageCoroutine(payload: Partial<Page>): Generator {
    const page = this.pages.current[0].write(comps.Page);

    Object.assign(page, payload);

    yield;
  }

  @co private *updatePartCoroutine(payload: Part): Generator {
    this.updatePartWithoutSnapshotCoroutine(payload);
    this.createSnapshot();

    yield;
  }

  @co private *updatePartWithoutSnapshotCoroutine(payload: Part): Generator {
    const partEntity = this.blocks.current.find((e) => e.read(comps.Part).id === payload.id);

    if (!partEntity) {
      console.warn(`Part with id ${payload.id} not found`);
      return;
    }

    const part = partEntity.write(comps.Part);
    Object.assign(part, payload);

    yield;
  }

  @co private *centerViewportCoroutine(): Generator {
    const viewport = this.resources.viewport;

    if (!viewport) {
      console.warn('Viewport not found');
      return;
    }

    let position: PIXI.PointData = { x: 0, y: 0 };
    if (this.page.scrollDirection === ScrollDirection.Horizontal) {
      position = {
        x: (0.5 * this.viewportScale.worldScreenWidth - viewport.x) / viewport.scale.x,
        y: 0,
      };
    } else {
      position = {
        x: 0,
        y: (0.5 * this.viewportScale.worldScreenHeight - viewport.y) / viewport.scale.y,
      };
    }

    // const scale = getDefaultScale(this.page, container);

    viewport.animate({
      time: 1000,
      position,
      ease: 'easeInOutSine',
      scale: 1,
      removeOnInterrupt: false,
    });

    yield;
  }

  @co private *deselectAllCoroutine(): Generator {
    for (const seletedBlockEntity of this.selectedBlocks.current) {
      removeComponent(seletedBlockEntity, comps.Selected);
    }
    yield;
  }

  @co private *createSnapshotCoroutine(): Generator {
    this.createSnapshot();
    yield;
  }

  @co private *groupSelectedPartsCoroutine(): Generator {
    // find biggest group in parts
    let group: Entity | null = null;
    let biggestGroupSize = 0;
    for (const partEntity of this.selectedBlocks.current) {
      const part = partEntity.read(comps.Part);
      if (!part.group) continue;

      const size = part.group.read(comps.Group).parts.length;
      if (size > biggestGroupSize) {
        group = part.group;
        biggestGroupSize = size;
      }
    }

    if (!group) {
      group = createGroup(this, {
        id: uuid(),
        pageId: this.page.id,
      } as Group);
    }

    for (const partEntity of this.selectedBlocks.current) {
      const part = partEntity.write(comps.Part);
      part.group = group;
      part.groupId = group.read(comps.Group).id;
    }

    deleteUnusedGroups(this.groups.current);

    // select the Group
    group.read(comps.Group).parts.forEach((part) => {
      addComponent(part, comps.Selected);
    });

    this.createSnapshot();

    yield;
  }

  @co private *ungroupSelectedPartsCoroutine(): Generator {
    const groupSelected = isGroupSelected(this.selectedBlocks.current);

    if (!groupSelected) return;

    const group = this.selectedBlocks.current[0].read(comps.Part).group;
    if (!group) return;

    deleteGroup(group);

    this.createSnapshot();

    yield;
  }

  @co private *deleteSelectedPartsCoroutine(): Generator {
    for (const seletedBlockEntity of this.selectedBlocks.current) {
      deleteEntity(seletedBlockEntity);
    }

    deleteUnusedGroups(this.groups.current);

    this.createSnapshot();

    yield;
  }

  @co private *bringSelectedPartsForward(): Generator {
    this.updateRanks(this.selectedBlocks.current, 'forward');

    yield;
  }

  @co private *sendSelectedPartsBackward(): Generator {
    this.updateRanks(this.selectedBlocks.current, 'backward');

    yield;
  }

  @co private *duplicateSelectedParts(): Generator {
    const state = serializeParts(this.selectedBlocks.current);

    for (const blockEntity of this.selectedBlocks.current) {
      removeComponent(blockEntity, comps.Selected);
    }

    if (
      this.blocks.current.length + this.selectedBlocks.current.length >
      this.siteLimits.partsCount
    ) {
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

    this.createSnapshot();
  }

  @co private *addEffectCoroutine(effect: Effect): Generator {
    let partOrGroupEntity: Entity | null = null;
    if (effect.partId !== null) {
      const part = this.blocks.current.find((e) => e.read(comps.Part).id === effect.partId);
      if (!part) {
        console.warn(`Part with id ${effect.partId} not found`);
        return;
      }
      partOrGroupEntity = part;
    } else if (effect.groupId !== null) {
      const group = this.groups.current.find((e) => e.read(comps.Group).id === effect.groupId);
      if (!group) {
        console.warn(`Group with id ${effect.groupId} not found`);
        return;
      }
      partOrGroupEntity = group;
    } else {
      console.warn('Effect has no partId or groupId');
      return;
    }

    createEffect(this, effect, partOrGroupEntity);

    this.createSnapshot();

    yield;
  }

  @co private *updateEffectCoroutine(effect: Effect): Generator {
    const effectEntity = this.effects.current.find((e) => e.read(comps.Effect).id === effect.id);
    if (effectEntity) updateEffect(effectEntity, effect);

    this.createSnapshot();

    yield;
  }

  @co private *updateEffectNoSnapshotCoroutine(effect: Effect): Generator {
    const effectEntity = this.effects.current.find((e) => e.read(comps.Effect).id === effect.id);
    if (effectEntity) updateEffect(effectEntity, effect);

    yield;
  }

  @co private *removeEffectCoroutine(effect: Effect): Generator {
    const effectEntity = this.effects.current.find((e) => e.read(comps.Effect).id === effect.id);
    if (effectEntity) {
      deleteEntity(effectEntity);
    }

    this.createSnapshot();

    yield;
  }

  public initialize(): void {
    this.registerEvent('world:update-cursor', (payload: Part) =>
      this.updateCursorCoroutine(payload),
    );
    this.registerEvent('world:update-brush', (payload: Partial<Brush>) =>
      this.updateBrushCoroutine(payload),
    );
    this.registerEvent('world:update-site-limits', (payload: InputSettings) =>
      this.updateSiteLimitsCoroutine(payload),
    );
    this.registerEvent('world:update-input-settings', (payload: InputSettings) =>
      this.updateInputSettingsCoroutine(payload),
    );
    this.registerEvent('world:update-layer', (payload: Layer) =>
      this.updateLayerCoroutine(payload),
    );
    this.registerEvent('world:update-page', (payload: Page) => this.updatePageCoroutine(payload));
    this.registerEvent('world:update-part', (payload: Part) => this.updatePartCoroutine(payload));
    this.registerEvent('world:update-part-without-snapshot', (payload: Part) =>
      this.updatePartWithoutSnapshotCoroutine(payload),
    );
    this.registerEvent('world:center-viewport', () => this.centerViewportCoroutine());
    this.registerEvent('world:deselect-all', () => this.deselectAllCoroutine());
    this.registerEvent('world:create-snapshot', () => this.createSnapshotCoroutine());
    this.registerEvent('world:group-selected-parts', () => this.groupSelectedPartsCoroutine());
    this.registerEvent('world:ungroup-selected-parts', () => this.ungroupSelectedPartsCoroutine());
    this.registerEvent('world:delete-selected-parts', () => this.deleteSelectedPartsCoroutine());
    this.registerEvent('world:bring-selected-parts-forward', () =>
      this.bringSelectedPartsForward(),
    );
    this.registerEvent('world:send-selected-parts-backward', () =>
      this.sendSelectedPartsBackward(),
    );
    this.registerEvent('world:duplicate-selected-parts', () => this.duplicateSelectedParts());
    this.registerEvent('world:add-effect', (payload: Effect) => this.addEffectCoroutine(payload));
    this.registerEvent('world:update-effect', (payload: Effect) =>
      this.updateEffectCoroutine(payload),
    );
    this.registerEvent('world:update-effect-no-shapshot', (payload: Effect) =>
      this.updateEffectNoSnapshotCoroutine(payload),
    );
    this.registerEvent('world:remove-effect', (payload: Effect) =>
      this.removeEffectCoroutine(payload),
    );
  }

  public execute(): void {
    if (this.parts.added.length) {
      this.resources.emitter.emit('parts:add', readParts(this.parts.added));
    }

    if (this.parts.changed.length) {
      this.resources.emitter.emit('parts:update', readParts(this.parts.changed));
    }

    if (this.parts.removed.length) {
      this.accessRecentlyDeletedData(true);
      this.resources.emitter.emit('parts:remove', readParts(this.parts.removed));
    }

    if (this.hoveredParts.added.length) {
      this.resources.emitter.emit('parts:hover', readParts(this.hoveredParts.added));
    }

    if (this.hoveredParts.removed.length) {
      this.resources.emitter.emit('parts:unhover', readParts(this.hoveredParts.removed));
    }

    if (this.selectedParts.added.length) {
      this.resources.emitter.emit('parts:select', readParts(this.selectedParts.added));
    }

    if (this.selectedParts.removed.length) {
      this.resources.emitter.emit('parts:unselect', readParts(this.selectedParts.removed));
    }

    if (this.draggedParts.added.length) {
      this.resources.emitter.emit('parts:dragged', readParts(this.draggedParts.added));
    }

    if (this.draggedParts.removed.length) {
      this.resources.emitter.emit('parts:undragged', readParts(this.draggedParts.removed));
    }

    if (this.editedParts.added.length) {
      this.resources.emitter.emit('parts:edited', readParts(this.editedParts.added));
    }

    if (this.editedParts.removed.length) {
      this.resources.emitter.emit('parts:unedited', readParts(this.editedParts.removed));
    }

    if (this.typedParts.added.length) {
      this.resources.emitter.emit('parts:typed', readParts(this.typedParts.added));
    }

    if (this.typedParts.removed.length) {
      this.resources.emitter.emit('parts:untyped', readParts(this.typedParts.removed));
    }

    if (this.groups.added.length) {
      this.resources.emitter.emit('groups:add', readGroups(this.groups.added));
    }

    if (this.groups.changed.length) {
      this.resources.emitter.emit('groups:update', readGroups(this.groups.changed));
    }

    if (this.groups.removed.length) {
      this.accessRecentlyDeletedData(true);
      this.resources.emitter.emit('groups:remove', readGroups(this.groups.removed));
    }

    if (this.effects.added.length) {
      this.resources.emitter.emit('effects:add', readEffects(this.effects.added));
    }

    // if (this.effects.changed.length) {
    //   this.resources.emitter.emit('effects:update', readEffects(this.effects.changed));
    // }

    if (this.effects.removed.length) {
      this.accessRecentlyDeletedData(true);
      this.resources.emitter.emit('effects:remove', readEffects(this.effects.removed));
    }

    if (this.tiles.added.length) {
      this.resources.emitter.emit('tiles:add', readTiles(this.tiles.added));
    }

    if (this.tiles.changed.length) {
      this.resources.emitter.emit('tiles:update', readTiles(this.tiles.changed));
    }

    if (this.tiles.removed.length) {
      this.accessRecentlyDeletedData(true);
      this.resources.emitter.emit('tiles:remove', readTiles(this.tiles.removed));
    }
  }

  private updateRanks(partEntities: readonly Entity[], direction: 'forward' | 'backward'): void {
    let [min, max] = getRankBounds(this.blocks.current);

    let sortedParts = sortByRank(readParts(partEntities));
    if (direction === 'backward') {
      sortedParts = sortedParts.reverse();
    }

    for (const part of sortedParts) {
      const partEntity = partEntities.find((e) => e.read(comps.Part).id === part.id);
      if (!partEntity) continue;

      const currRank = LexoRank.parse(partEntity.read(comps.Part).rank);

      if (direction === 'forward') {
        if (currRank.compareTo(max) < 0) {
          const p = partEntity.write(comps.Part);
          max = max.genNext();
          p.rank = max.toString();
        }
      } else if (currRank.compareTo(min) > 0) {
        const p = partEntity.write(comps.Part);
        min = min.genPrev();
        p.rank = min.toString();
      }
    }

    this.createSnapshot();
  }
}

export default EventReceiver;

import type { Entity } from '@lastolivegames/becsy';
import { ScrollDirection, TriggerReason } from '@prisma/client';
import type { Transform } from '@scrolly-page/effects';
import { getEffectTransform, multiplyTransforms } from '@scrolly-page/effects';
import { LexoRank } from 'lexorank';

import * as comps from '../components/index.js';
import { SCROLL_END_PADDING } from '../constants.js';
import BaseSystem from './Base.js';
import { getAllEffectsForPart, getBoundingBox, readEffect } from './common.js';
import InputReader from './InputReader.js';

class EffectHandler extends BaseSystem {
  private readonly page = this.singleton.read(comps.Page);

  private readonly view = this.singleton.write(comps.View);

  private readonly viewportScale = this.singleton.read(comps.ViewportScale);

  private readonly viewportScaleQuery = this.query(
    (q) => q.current.and.addedOrChanged.with(comps.ViewportScale).write.trackWrites,
  );

  private readonly scrollBoundsQuery = this.query((q) => q.current.with(comps.ScrollBounds).write);

  private readonly input = this.singleton.read(comps.Input);

  private readonly blocks = this.query(
    (q) =>
      q.addedChangedOrRemoved.and.current.and.changed.and.addedOrChanged
        .with(comps.Block)
        .write.and.with(comps.Part)
        .trackWrites.and.with(comps.Aabb)
        .using(comps.Selected)
        .read.and.using(comps.Transform).write,
  );

  private readonly effects = this.query(
    (q) =>
      q.current.and.addedOrChanged.and.addedChangedOrRemoved
        .with(comps.Effect)
        .trackWrites.write.using(comps.EffectBounds).write,
  );

  private readonly groups = this.query((q) => q.current.with(comps.Group).write);

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(InputReader));
  }

  public execute(): void {
    const entities = this.effectBoundsNeedsUpdate();
    for (const entity of entities) {
      this.updateEffectBounds(entity);
    }

    if (this.blocks.addedChangedOrRemoved.length > 0 || this.input.resizedTrigger) {
      this.updateScrollBounds();
    }

    this.applyScrollEffects();
  }

  private updateScrollBounds(): void {
    const bbox = getBoundingBox(this.blocks.current);
    const maxBound = this.page.scrollDirection === ScrollDirection.Horizontal ? bbox[2] : bbox[3];

    const worldScreenSize =
      this.page.scrollDirection === ScrollDirection.Horizontal
        ? this.viewportScale.worldScreenWidth
        : this.viewportScale.worldScreenHeight;

    const worldSize = maxBound + SCROLL_END_PADDING;
    let scrollBoundsMax = worldSize - worldScreenSize;
    if (this.view.bufferEnd) {
      scrollBoundsMax += worldScreenSize / 2;
    }

    const scrollBounds = this.scrollBoundsQuery.current[0].write(comps.ScrollBounds);
    scrollBounds.max = scrollBoundsMax;
    scrollBounds.worldSize = worldSize;
  }

  private effectBoundsNeedsUpdate(): Entity[] {
    const partIds = new Set<string>();
    const groupIds = new Set<string>();
    if (this.effects.addedOrChanged.length > 0) {
      for (const effectEntity of this.effects.addedOrChanged) {
        const effect = effectEntity.read(comps.Effect);
        if (effect.part) {
          partIds.add(effect.partId);
        } else {
          groupIds.add(effect.groupId);
        }
      }
    }
    for (const blockEntity of this.blocks.addedOrChanged) {
      const part = blockEntity.read(comps.Part);
      if (part.effects.length > 0) {
        partIds.add(part.id);
      } else if (part.group && part.group.read(comps.Group).effects.length > 0) {
        groupIds.add(part.groupId);
      }
    }
    if (this.viewportScaleQuery.addedOrChanged.length > 0) {
      for (const blockEntity of this.blocks.current) {
        const part = blockEntity.read(comps.Part);
        if (part.effects.length > 0) {
          partIds.add(part.id);
        }
      }

      for (const groupEntity of this.groups.current) {
        const group = groupEntity.read(comps.Group);
        if (group.effects.length > 0) {
          groupIds.add(group.id);
        }
      }
    }

    const entities: Entity[] = [];
    for (const partId of partIds) {
      const partEntity = this.blocks.current.find((entity) => {
        const part = entity.read(comps.Part);
        return part.id === partId;
      });

      if (partEntity) {
        entities.push(partEntity);
      }
    }
    for (const groupId of groupIds) {
      const groupEntity = this.groups.current.find((entity) => {
        const group = entity.read(comps.Group);
        return group.id === groupId;
      });

      if (groupEntity) {
        entities.push(groupEntity);
      }
    }

    return entities;
  }

  private updateEffectBounds(partOrGroupEntity: Entity): void {
    const isVertical = this.page.scrollDirection === ScrollDirection.Vertical;
    let effects: Entity[] = [];
    let top = 0;
    let height = 0;
    let left = 0;
    let width = 0;
    if (partOrGroupEntity.has(comps.Part)) {
      const part = partOrGroupEntity.read(comps.Part);
      effects = part.effects;
      top = part.top;
      height = part.height;
      left = part.left;
      width = part.width;
    } else if (partOrGroupEntity.has(comps.Group)) {
      const group = partOrGroupEntity.read(comps.Group);
      effects = group.effects;
      const bbox = getBoundingBox(group.parts);
      top = bbox[1];
      height = bbox[3] - bbox[1];
      left = bbox[0];
      width = bbox[2] - bbox[0];
    }

    const sortedEffects = effects
      .map((entity) => readEffect(entity))
      .sort((a, b) => LexoRank.parse(a.rank).compareTo(LexoRank.parse(b.rank)));

    const screenHeight = this.viewportScale.worldScreenHeight;
    const screenWidth = this.viewportScale.worldScreenWidth;

    let prevBounds = [0, 0];
    for (let i = 0; i < sortedEffects.length; i++) {
      const effect = sortedEffects[i];

      let min = 0;
      if (effect.startWhen === TriggerReason.BeforeEnter) {
        if (isVertical) {
          min = top - screenHeight;
        } else {
          min = left - screenWidth;
        }
      } else if (effect.startWhen === TriggerReason.ScreenMiddle) {
        if (isVertical) {
          min = top + 0.5 * height - 0.5 * screenHeight;
        } else {
          min = left + 0.5 * width - 0.5 * screenWidth;
        }
      } else if (effect.startWhen === TriggerReason.ScreenStart) {
        min = isVertical ? top : left;
      } else if (effect.startWhen === TriggerReason.ScreenEnd) {
        if (isVertical) {
          min = top - screenHeight + height;
        } else {
          min = left - screenWidth + width;
        }
      } else if (effect.startWhen === TriggerReason.WithPrevious) {
        min = prevBounds[0];
      } else if (effect.startWhen === TriggerReason.AfterPrevious) {
        min = prevBounds[1];
      }

      const max = min + effect.distancePx;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const effectEntity = effects.find((entity) => {
        const e = entity.read(comps.Effect);
        return e.id === effect.id;
      })!;

      if (!effectEntity.has(comps.EffectBounds)) {
        effectEntity.add(comps.EffectBounds);
      }

      const effectBounds = effectEntity.write(comps.EffectBounds);
      effectBounds.startPx = min;
      effectBounds.endPx = max;

      prevBounds = [min, max];

      effectBounds.startTransform = getEffectTransform(
        readEffect(effectEntity),
        0,
        this.page.scrollDirection,
      );

      effectBounds.endTransform = getEffectTransform(
        readEffect(effectEntity),
        1,
        this.page.scrollDirection,
      );
    }
  }

  private applyScrollEffects(): void {
    for (const blockEntity of this.blocks.current) {
      const transform = this.getTransform(blockEntity, this.view.current);
      if (!transform) continue;

      const t = blockEntity.read(comps.Transform);
      if (t.isSameAs(transform)) continue;

      const wt = blockEntity.write(comps.Transform);
      wt.transform = transform;
    }
  }

  private getTransform(partEntity: Entity, current: number): Transform | null {
    let transform: Transform | null = null;
    const effects = getAllEffectsForPart(partEntity);

    for (const effectsEntity of effects) {
      if (transform === null) transform = [1, 0, 0, 1, 0, 0, 1];

      if (!effectsEntity.has(comps.EffectBounds)) continue;
      const bounds = effectsEntity.read(comps.EffectBounds);

      if (current <= bounds.startPx) {
        const t = bounds.startTransform;
        transform = multiplyTransforms(transform, t);
      } else if (current > bounds.startPx && current < bounds.endPx) {
        const percent = (current - bounds.startPx) / (bounds.endPx - bounds.startPx);
        const t = getEffectTransform(readEffect(effectsEntity), percent, this.page.scrollDirection);
        transform = multiplyTransforms(transform, t);
      } else {
        const t = bounds.endTransform;
        transform = multiplyTransforms(transform, t);
      }
    }

    return transform;
  }
}

export default EffectHandler;

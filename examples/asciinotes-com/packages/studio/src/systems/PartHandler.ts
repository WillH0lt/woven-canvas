import type { Entity } from '@lastolivegames/becsy';

import * as comps from '../components/index.js';
import BaseSystem from './Base.js';
import {
  addGhostPart,
  deleteEntity,
  getAabb,
  getAllEffectsForPart,
  getAllPartsForEffect,
  updateGhostPart,
} from './common.js';
import TransformHandler from './TransformHandler.js';

class PartHandler extends BaseSystem {
  private readonly parts = this.query(
    (q) =>
      q.added.and.addedOrChanged.and.current.and.removed.and.changed
        .with(comps.Part)
        .write.trackWrites.using(comps.Inactive, comps.Ghost, comps.Transform).write,
  );

  private readonly aabbs = this.query(
    (q) => q.addedOrChanged.with(comps.Part).trackWrites.and.with(comps.Aabb).write,
  );

  private readonly groups = this.query((q) => q.changed.with(comps.Group).write.trackWrites);

  private readonly effects = this.query(
    (q) =>
      q.added.and.current.and.removed.and.addedChangedOrRemoved
        .with(comps.Effect)
        .write.trackWrites.using(comps.Group).read,
  );

  public constructor() {
    super();
    this.schedule((s) => s.inAnyOrderWith(TransformHandler));
  }

  public execute(): void {
    // ========================================
    // Aabb

    for (const aabbEntity of this.aabbs.addedOrChanged) {
      const value = getAabb(aabbEntity);
      const aabb = aabbEntity.write(comps.Aabb);
      aabb.value = value;
    }

    // ========================================
    // Ghosts

    for (const partEntity of this.parts.addedOrChanged) {
      if (partEntity.has(comps.ToBeDeleted)) continue;

      const part = partEntity.read(comps.Part);

      for (const ghostEntity of part.ghosts) {
        updateGhostPart(ghostEntity, partEntity);
      }
    }

    if (this.parts.removed.length) {
      this.accessRecentlyDeletedData(true);
    }
    for (const partEntity of this.parts.removed) {
      // remove ghosts
      const part = partEntity.read(comps.Part);
      for (const ghostEntity of part.ghosts) {
        deleteEntity(ghostEntity);
      }
    }

    // =========================================
    // Groups
    for (const groupEntity of this.groups.changed) {
      console.log('Group added/changed/removed', groupEntity);
      const group = groupEntity.read(comps.Group);

      if (group.effects.length === 0) continue;

      for (const partEntity of group.parts) {
        const part = partEntity.read(comps.Part);
        if (part.ghosts.length !== 0) continue;

        addGhostPart(this, partEntity);

        // signal that the part was updated
        partEntity.write(comps.Part);
      }
    }

    // ========================================
    // Effects
    for (const effectEntity of this.effects.added) {
      const effect = effectEntity.read(comps.Effect);

      const partEntities: Entity[] = [];
      if (effect.part) {
        partEntities.push(effect.part);
      } else if (effect.group) {
        const group = effect.group.read(comps.Group);
        partEntities.push(...group.parts);
      }

      for (const partEntity of partEntities) {
        const part = partEntity.read(comps.Part);

        if (part.ghosts.length !== 0) continue;

        addGhostPart(this, partEntity);

        // signal that the part was updated
        partEntity.write(comps.Part);
      }
    }

    if (this.effects.removed.length) {
      this.accessRecentlyDeletedData(true);
    }
    for (const effectEntity of this.effects.removed) {
      const partEntities = getAllPartsForEffect(effectEntity);

      for (const partEntity of partEntities) {
        const effects = getAllEffectsForPart(partEntity);
        if (effects.length !== 1) continue;

        const { ghosts } = partEntity.read(comps.Part);
        for (const ghostEntity of ghosts) {
          deleteEntity(ghostEntity);
        }

        const transform = partEntity.write(comps.Transform);
        transform.identity();
      }
    }
  }
}
export default PartHandler;

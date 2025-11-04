import type { Entity } from '@lastolivegames/becsy';
import { co } from '@lastolivegames/becsy';

import * as comps from '../components/index.js';
import BaseSystem from './Base.js';
import { addComponent, removeComponent } from './common.js';

class TransformHandler extends BaseSystem {
  private readonly viewportScale = this.singleton.read(comps.ViewportScale);

  private readonly parts = this.query((q) =>
    q.added.and.changed.and.current
      .with(comps.Part)
      .trackWrites.and.using(comps.Transform, comps.Inactive, comps.Selected)
      .write.trackWrites.without(comps.Ghost),
  );

  private readonly layers = this.query((q) => q.addedOrChanged.with(comps.Layer).write.trackWrites);

  @co private *updateTransformDelayed(partEntity: Entity): Generator {
    // small delay while ghosts are being added
    yield co.waitForFrames(2);

    this.updatePartTransform(partEntity);
  }

  public execute(): void {
    for (const partEntity of this.parts.added) {
      this.updateTransformDelayed(partEntity.hold());
    }

    for (const partEntity of this.parts.changed) {
      this.updatePartTransform(partEntity);
    }

    for (const layerEntity of this.layers.addedOrChanged) {
      const layer = layerEntity.read(comps.Layer);

      for (const partEntity of this.parts.current) {
        const part = partEntity.read(comps.Part);
        if (part.layer !== layer.kind) continue;

        if (layer.active) {
          removeComponent(partEntity, comps.Inactive);
          removeComponent(partEntity, comps.Selected);
        } else {
          addComponent(partEntity, comps.Inactive);
        }
      }
    }
  }

  private updatePartTransform(partEntity: Entity): void {
    if (!partEntity.has(comps.Transform)) return;

    const { ghosts } = partEntity.read(comps.Part);

    if (this.viewportScale.relativeUnits) {
      this.applyFullTransform(partEntity, partEntity);
    } else {
      for (const ghostEntity of ghosts) {
        this.applyFullTransform(ghostEntity, partEntity);
      }
    }
  }

  private applyFullTransform(partEntity: Entity, transformEntity: Entity): void {
    const part = partEntity.read(comps.Part);
    const transform = transformEntity.read(comps.Transform);

    const htmlElement = document.getElementById(part.id);

    if (htmlElement?.parentElement) {
      let tx = transform.tx;
      let ty = transform.ty;
      if (this.viewportScale.relativeUnits) {
        tx *= this.viewportScale.value;
        ty *= this.viewportScale.value;
      }

      htmlElement.parentElement.style.transform = `matrix(${transform.a}, ${transform.b}, ${transform.c}, ${transform.d}, ${tx}, ${ty})`;
      htmlElement.parentElement.style.opacity = (transform.opacity * part.opacity).toString();
    }
  }

  // private setOpacity(partEntity: Entity, opacity: number): void {
  //   const part = partEntity.read(comps.Part);
  //   const htmlElement = document.getElementById(part.id);

  //   if (htmlElement) {
  //     htmlElement.style.opacity = opacity.toString();
  //   }
  // }
}

export default TransformHandler;

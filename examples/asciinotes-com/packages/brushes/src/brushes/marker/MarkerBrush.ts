import * as PIXI from 'pixi.js';

import BaseBrush from '../BaseBrush.js';
import type { DrawSegment } from '../types.js';
import { BrushKinds } from '../types.js';
import { MarkerShader } from './MarkerShader.js';

class MarkerBrush extends BaseBrush {
  public static kind = BrushKinds.Marker;

  protected shader: MarkerShader | null = null;

  // // defined as a property to avoid memory overhead from creating new transform every frame
  // private readonly _transform = new PIXI.Matrix();

  public async init(): Promise<void> {
    PIXI.Assets.add([
      {
        alias: 'markerShape',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/marker/shape.png',
      },
      {
        alias: 'markerGrain',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/marker/grain.png',
      },
    ]);

    const { markerShape, markerGrain } = (await PIXI.Assets.load([
      'markerShape',
      'markerGrain',
    ])) as { markerShape: PIXI.Texture; markerGrain: PIXI.Texture };

    this.shader = new MarkerShader({
      markerShape,
      markerGrain,
    });

    this.initializeBrush(this.shader, {
      blendMode: 'multiply',
    });
  }

  public draw(segment: DrawSegment, texture: PIXI.Texture): void {
    if (!this.brush || !this.shader) {
      throw new Error('cannot draw, brush is not initialized');
    }

    this.shader.setBrushColor([segment.red, segment.green, segment.blue, 0.4 * segment.alpha]);
    const spacing = 0.01 * segment.size;

    const points = this.getStampPoints(segment, spacing);
    this.renderStamps(points, segment, texture);
  }
}

export default MarkerBrush;

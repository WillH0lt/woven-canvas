import * as PIXI from 'pixi.js';

import BaseBrush from '../BaseBrush.js';
import type { DrawSegment } from '../types.js';
import { BrushKinds } from '../types.js';
import { CrayonShader } from './CrayonShader.js';

class CrayonBrush extends BaseBrush {
  public static kind = BrushKinds.Crayon;

  protected shader: CrayonShader | null = null;

  public async init(): Promise<void> {
    PIXI.Assets.add([
      {
        alias: 'crayonShape',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/crayon/shape.png',
      },
      {
        alias: 'crayonGrain',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/crayon/grain.png',
      },
    ]);

    const { crayonShape, crayonGrain } = (await PIXI.Assets.load([
      'crayonShape',
      'crayonGrain',
    ])) as { crayonShape: PIXI.Texture; crayonGrain: PIXI.Texture };

    this.shader = new CrayonShader({
      crayonShape,
      crayonGrain,
    });

    this.initializeBrush(this.shader, {
      blendMode: 'multiply',
    });
  }

  public draw(segment: DrawSegment, texture: PIXI.Texture): void {
    if (!this.brush || !this.shader) {
      throw new Error('cannot draw, brush is not initialized');
    }

    this.shader.setBrushColor([segment.red, segment.green, segment.blue, segment.alpha]);
    const spacing = 0.1 * segment.size;

    const points = this.getStampPoints(segment, spacing);
    this.renderStamps(points, segment, texture);
  }
}

export default CrayonBrush;

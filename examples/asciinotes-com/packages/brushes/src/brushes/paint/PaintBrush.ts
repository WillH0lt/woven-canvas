import * as PIXI from 'pixi.js';

import BaseBrush from '../BaseBrush.js';
import type { DrawSegment } from '../types.js';
import { BrushKinds } from '../types.js';
import { PaintShader } from './PaintShader.js';

class PaintBrush extends BaseBrush {
  public static kind = BrushKinds.Paint;

  protected shader: PaintShader | null = null;

  public async init(): Promise<void> {
    PIXI.Assets.add([
      {
        alias: 'paintShape',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/paint/shape.png',
      },
      {
        alias: 'paintGrain',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/paint/grain.png',
      },
    ]);

    const { paintShape, paintGrain } = (await PIXI.Assets.load(['paintShape', 'paintGrain'])) as {
      paintShape: PIXI.Texture;
      paintGrain: PIXI.Texture;
    };

    this.shader = new PaintShader({
      paintShape,
      paintGrain,
    });

    this.initializeBrush(this.shader, {
      blendMode: 'add',
    });
  }

  public draw(segment: DrawSegment, texture: PIXI.Texture): void {
    if (!this.brush || !this.shader) {
      throw new Error('cannot draw, brush is not initialized');
    }

    this.shader.setBrushColor([segment.red, segment.green, segment.blue, segment.alpha]);
    const spacing = 0.01 * segment.size;

    const points = this.getStampPoints(segment, spacing);
    this.renderStamps(points, segment, texture);
  }
}

export default PaintBrush;

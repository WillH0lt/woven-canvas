import * as PIXI from 'pixi.js';

import BaseBrush from '../BaseBrush.js';
import type { DrawSegment } from '../types.js';
import { BrushKinds } from '../types.js';

class EraserBrush extends BaseBrush {
  public static kind = BrushKinds.Eraser;

  protected eraserTexture: PIXI.Texture | null = null;

  protected eraserSprite: PIXI.Sprite | null = null;

  public async init(): Promise<void> {
    PIXI.Assets.add([
      {
        alias: 'eraserShape',
        src: 'https://storage.googleapis.com/sketch-paper-public/brushes/paint/shape.png',
      },
    ]);

    const { eraserShape } = (await PIXI.Assets.load(['eraserShape'])) as {
      eraserShape: PIXI.Texture;
    };

    this.eraserTexture = eraserShape;
    this.eraserSprite = new PIXI.Sprite(this.eraserTexture);
    this.eraserSprite.anchor.set(0.5, 0.5);
  }

  public draw(segment: DrawSegment, texture: PIXI.Texture): void {
    if (!this.eraserSprite || !this.eraserTexture) {
      throw new Error('cannot draw, brush is not initialized');
    }

    const spacing = 0.01 * segment.size;
    const points = this.getStampPoints(segment, spacing);

    if (points.length === 0) return;

    const container = new PIXI.Container();
    this.eraserSprite.blendMode = 'erase';

    for (const [x, y] of points) {
      const stamp = new PIXI.Sprite(this.eraserTexture);
      stamp.anchor.set(0.5, 0.5);
      stamp.position.set(x - segment.tileX, y - segment.tileY);
      stamp.width = 3 * segment.size;
      stamp.height = 3 * segment.size;
      stamp.blendMode = 'erase';

      container.addChild(stamp);
    }

    this.app.renderer.render({
      target: texture,
      container,
      clear: false,
    });

    // Clean up
    container.destroy({ children: true });
  }
}

export default EraserBrush;

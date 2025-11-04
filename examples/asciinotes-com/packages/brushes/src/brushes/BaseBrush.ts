import * as PIXI from 'pixi.js';
import type BaseShader from './BaseShader.js';
import type { DrawSegment } from './types.js';
import { BrushKinds } from './types.js';

const SCALE = 1000;

abstract class BaseBrush {
  public static kind = BrushKinds.None;

  protected brush: PIXI.Mesh | null = null;

  protected app: PIXI.Application;

  protected shader: BaseShader | null = null;

  public constructor(app: PIXI.Application) {
    this.app = app;
  }

  protected initializeBrush(shader: BaseShader, options: Partial<PIXI.MeshOptions>): void {
    const geometry = new PIXI.Geometry({
      attributes: {
        aPosition: [0, 0, 1, 0, 1, 1, 0, 1],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });

    const brush = new PIXI.Mesh({
      geometry,
      shader,
      ...options,
    });

    brush.scale.set(SCALE, SCALE);

    this.brush = brush as PIXI.Mesh;
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  protected getStampPoints(segment: DrawSegment, spacing: number): [number, number][] {
    const direction = [segment.endX - segment.startX, segment.endY - segment.startY];
    const segmentLength = Math.sqrt(direction[0] ** 2 + direction[1] ** 2);
    if (segmentLength === 0) return [];

    direction[0] /= segmentLength;
    direction[1] /= segmentLength;

    let stampedLength = 0;
    const start = [segment.startX, segment.startY] as [number, number];
    if (segment.runningLength > 0) {
      const diff = spacing - (segment.runningLength % spacing);
      start[0] += direction[0] * diff;
      start[1] += direction[1] * diff;
      stampedLength += diff;
    }

    const points = [] as [number, number][];
    while (stampedLength < segmentLength) {
      start[0] += direction[0] * spacing;
      start[1] += direction[1] * spacing;
      stampedLength += spacing;

      points.push([start[0], start[1]]);
    }

    return points;
  }

  protected renderStamps(
    points: [number, number][],
    segment: DrawSegment,
    texture: PIXI.Texture,
  ): void {
    if (points.length === 0 || this.brush === null) return;

    const prev = points[0];
    for (const [x, y] of points) {
      this.shader?.setPrevPosition([prev[0], prev[1]]);
      this.shader?.setPosition([x, y]);
      prev[0] = x;
      prev[1] = y;

      const transform = new PIXI.Matrix()
        .identity()
        .scale(segment.size, segment.size)
        .translate(x - segment.tileX - segment.size / 2, y - segment.tileY - segment.size / 2);

      this.app.renderer.render({
        transform,
        target: texture,
        container: this.brush,
        clear: false,
      });
    }
  }

  public abstract draw(segment: DrawSegment, texture: PIXI.Texture): void;

  public abstract init(): Promise<void>;
}

export default BaseBrush;

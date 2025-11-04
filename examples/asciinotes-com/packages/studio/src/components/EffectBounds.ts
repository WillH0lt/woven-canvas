import { component, field, Type } from '@lastolivegames/becsy';
import type { Transform } from '@scrolly-page/effects';

@component
class EffectBounds {
  @field.float64 declare public startPx: number;

  @field.float64 declare public endPx: number;

  @field({ type: Type.float64, default: 1 }) declare public startA: number;

  @field.float64 declare public startB: number;

  @field.float64 declare public startC: number;

  @field({ type: Type.float64, default: 1 }) declare public startD: number;

  @field.float64 declare public startTx: number;

  @field.float64 declare public startTy: number;

  @field.float64 declare public startOpacity: number;

  @field({ type: Type.float64, default: 1 }) declare public endA: number;

  @field.float64 declare public endB: number;

  @field.float64 declare public endC: number;

  @field({ type: Type.float64, default: 1 }) declare public endD: number;

  @field.float64 declare public endTx: number;

  @field.float64 declare public endTy: number;

  @field.float64 declare public endOpacity: number;

  public get endTransform(): Transform {
    return [this.endA, this.endB, this.endC, this.endD, this.endTx, this.endTy, this.endOpacity];
  }

  public set endTransform([a, b, c, d, tx, ty, opacity]: Transform) {
    this.endA = a;
    this.endB = b;
    this.endC = c;
    this.endD = d;
    this.endTx = tx;
    this.endTy = ty;
    this.endOpacity = opacity;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public get startTransform(): Transform {
    return [
      this.startA,
      this.startB,
      this.startC,
      this.startD,
      this.startTx,
      this.startTy,
      this.startOpacity,
    ];
  }

  public set startTransform([a, b, c, d, tx, ty, opacity]: Transform) {
    this.startA = a;
    this.startB = b;
    this.startC = c;
    this.startD = d;
    this.startTx = tx;
    this.startTy = ty;
    this.startOpacity = opacity;
  }
}

export default EffectBounds;

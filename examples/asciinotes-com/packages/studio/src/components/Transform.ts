import type { Entity } from '@lastolivegames/becsy';
import { component, field, Type } from '@lastolivegames/becsy';
import type { Transform } from '@scrolly-page/effects';

@component
class Xform {
  @field.ref declare public part: Entity | null;

  @field({ type: Type.float64, default: 1 }) declare public a: number;

  @field.float64 declare public b: number;

  @field.float64 declare public c: number;

  @field({ type: Type.float64, default: 1 }) declare public d: number;

  @field.float64 declare public tx: number;

  @field.float64 declare public ty: number;

  @field({ type: Type.float64, default: 1 }) declare public opacity: number;

  public get transform(): Transform {
    return [this.a, this.b, this.c, this.d, this.tx, this.ty, this.opacity];
  }

  public set transform([a, b, c, d, tx, ty, opacity]: Transform) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
    this.opacity = opacity;
  }

  public identity(): void {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;
    this.opacity = 1;
  }

  public isSameAs(other: Transform): boolean {
    return (
      this.a === other[0] &&
      this.b === other[1] &&
      this.c === other[2] &&
      this.d === other[3] &&
      this.tx === other[4] &&
      this.ty === other[5] &&
      this.opacity === other[6]
    );
  }
}

export default Xform;

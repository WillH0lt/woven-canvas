import type { Effect } from '@prisma/client';
import { EffectDirection, ScrollDirection } from '@prisma/client';

export type Transform = [number, number, number, number, number, number, number];

export function invertTransform(transform: Transform): Transform {
  const det = transform[0] * transform[3] - transform[1] * transform[2];
  const invDet = 1 / det;

  const a0 = transform[3] * invDet;
  const a1 = -transform[1] * invDet;
  const a2 = -transform[2] * invDet;
  const a3 = transform[0] * invDet;
  const a4 = -transform[4];
  const a5 = -transform[5];
  // const opacity = 1 - transform[6];
  const opacity = transform[6];

  return [a0, a1, a2, a3, a4, a5, opacity];
}

export function getEffectTransform(
  effect: Effect,
  percent: number,
  scrollDirection: ScrollDirection,
): Transform {
  if (effect.direction === EffectDirection.Backwards) {
    // eslint-disable-next-line no-param-reassign
    percent = 1 - percent;
  }

  let x =
    scrollDirection === ScrollDirection.Horizontal
      ? effect.deltaParallel
      : effect.deltaPerpendicular;
  let y =
    scrollDirection === ScrollDirection.Horizontal
      ? effect.deltaPerpendicular
      : effect.deltaParallel;

  x *= percent;
  y *= percent;

  const theta = effect.deltaRotateZ * (Math.PI / 180) * percent;
  const s = 1 + (effect.scalarScale / 100 - 1) * percent;

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const opacity = 1 + (effect.scalarOpacity / 100 - 1) * percent;

  let transform: Transform = [
    cosTheta * s,
    sinTheta * s,
    -sinTheta * s,
    cosTheta * s,
    x,
    y,
    opacity,
  ];

  if (effect.direction === EffectDirection.Backwards) {
    transform = invertTransform(transform);
  }

  return transform;
}

export function multiplyTransforms(a: Transform, b: Transform): Transform {
  const a0 = a[0] * b[0] + a[1] * b[2];
  const a1 = a[0] * b[1] + a[1] * b[3];
  const a2 = a[2] * b[0] + a[3] * b[2];
  const a3 = a[2] * b[1] + a[3] * b[3];
  const a4 = a[4] + b[4];
  const a5 = a[5] + b[5];

  const opacity = a[6] * b[6];

  return [a0, a1, a2, a3, a4, a5, opacity];
}

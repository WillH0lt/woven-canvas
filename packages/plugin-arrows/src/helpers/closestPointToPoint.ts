import { Vec2 } from "@infinitecanvas/math";

/**
 * Find the closest point in an array to a target point.
 *
 * @param points - Array of points to search
 * @param target - Target point to find closest to
 * @returns The closest point, or null if the array is empty
 */
export function closestPointToPoint(
  points: Vec2[],
  target: Vec2
): Vec2 | null {
  if (points.length === 0) return null;

  let closestPoint: Vec2 = points[0];
  let closestDistanceSq = Vec2.distanceSq(points[0], target);

  for (let i = 1; i < points.length; i++) {
    const distanceSq = Vec2.distanceSq(points[i], target);
    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq;
      closestPoint = points[i];
    }
  }

  return closestPoint;
}

import { type Vec2, sub, scale, lengthSq, dot } from "@infinitecanvas/math";

/**
 * Smooth damp function for 2D vectors.
 *
 * Based on Unity's Vector3.SmoothDamp, which uses a critically damped spring
 * for smooth deceleration. This creates a natural feeling fling animation.
 *
 * @see https://docs.unity3d.com/ScriptReference/Vector3.SmoothDamp.html
 * @see https://github.com/Unity-Technologies/UnityCsReference/blob/a2bdfe9b3c4cd4476f44bf52f848063bfaf7b6b9/Runtime/Export/Math/Vector3.cs#L97
 *
 * @param current - Current position [x, y]
 * @param target - Target position [x, y]
 * @param velocity - Current velocity [vx, vy] (will be modified)
 * @param smoothTime - Approximate time to reach target (seconds)
 * @param maxSpeed - Maximum speed (use Infinity for no limit)
 * @param deltaTime - Time since last frame (seconds)
 * @returns New position and velocity
 */
export function smoothDamp(
  current: Vec2,
  target: Vec2,
  velocity: Vec2,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number
): { position: Vec2; velocity: Vec2 } {
  // Based on Game Programming Gems 4 Chapter 1.10
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;

  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const originalTo = target;
  let change = sub(current, target);

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime;
  const maxChangeSq = maxChange * maxChange;
  const changeLenSq = lengthSq(change);

  if (changeLenSq > maxChangeSq) {
    change = scale(change, maxChange / Math.sqrt(changeLenSq));
  }

  const clampedTarget = sub(current, change);

  const temp: Vec2 = [
    (velocity[0] + omega * change[0]) * deltaTime,
    (velocity[1] + omega * change[1]) * deltaTime,
  ];

  const newVelocity: Vec2 = [
    (velocity[0] - omega * temp[0]) * exp,
    (velocity[1] - omega * temp[1]) * exp,
  ];

  const position: Vec2 = [
    clampedTarget[0] + (change[0] + temp[0]) * exp,
    clampedTarget[1] + (change[1] + temp[1]) * exp,
  ];

  // Prevent overshooting
  const origMinusCurrent = sub(originalTo, current);
  const outMinusOrig = sub(position, originalTo);

  if (dot(origMinusCurrent, outMinusOrig) > 0) {
    position[0] = originalTo[0];
    position[1] = originalTo[1];

    newVelocity[0] = (position[0] - originalTo[0]) / deltaTime;
    newVelocity[1] = (position[1] - originalTo[1]) / deltaTime;
  }

  return { position, velocity: newVelocity };
}

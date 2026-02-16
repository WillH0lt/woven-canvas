import { Vec2 } from '@infinitecanvas/math'

// Internal temp vectors for smoothDamp calculations
const _change: Vec2 = [0, 0]
const _clampedTarget: Vec2 = [0, 0]
const _temp: Vec2 = [0, 0]
const _origMinusCurrent: Vec2 = [0, 0]
const _outMinusOrig: Vec2 = [0, 0]

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
  deltaTime: number,
): { position: Vec2; velocity: Vec2 } {
  // Based on Game Programming Gems 4 Chapter 1.10
  smoothTime = Math.max(0.0001, smoothTime)
  const omega = 2 / smoothTime

  const x = omega * deltaTime
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)

  // change = current - target
  Vec2.copy(_change, current)
  Vec2.sub(_change, target)

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime
  const maxChangeSq = maxChange * maxChange
  const changeLenSq = Vec2.lengthSq(_change)

  if (changeLenSq > maxChangeSq) {
    Vec2.scale(_change, maxChange / Math.sqrt(changeLenSq))
  }

  // clampedTarget = current - change
  Vec2.copy(_clampedTarget, current)
  Vec2.sub(_clampedTarget, _change)

  // temp = (velocity + omega * change) * deltaTime
  Vec2.set(_temp, (velocity[0] + omega * _change[0]) * deltaTime, (velocity[1] + omega * _change[1]) * deltaTime)

  const newVelocity: Vec2 = [(velocity[0] - omega * _temp[0]) * exp, (velocity[1] - omega * _temp[1]) * exp]

  const position: Vec2 = [
    _clampedTarget[0] + (_change[0] + _temp[0]) * exp,
    _clampedTarget[1] + (_change[1] + _temp[1]) * exp,
  ]

  // Prevent overshooting
  // origMinusCurrent = target - current
  Vec2.copy(_origMinusCurrent, target)
  Vec2.sub(_origMinusCurrent, current)
  // outMinusOrig = position - target
  Vec2.copy(_outMinusOrig, position)
  Vec2.sub(_outMinusOrig, target)

  if (Vec2.dot(_origMinusCurrent, _outMinusOrig) > 0) {
    position[0] = target[0]
    position[1] = target[1]

    newVelocity[0] = (position[0] - target[0]) / deltaTime
    newVelocity[1] = (position[1] - target[1]) / deltaTime
  }

  return { position, velocity: newVelocity }
}

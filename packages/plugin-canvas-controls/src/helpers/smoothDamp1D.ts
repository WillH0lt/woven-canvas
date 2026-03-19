/**
 * Smooth damp function for scalar values.
 *
 * 1D version of the 2D smoothDamp, based on Unity's Mathf.SmoothDamp.
 * Uses a critically damped spring for smooth deceleration.
 *
 * @param current - Current value
 * @param target - Target value
 * @param velocity - Current velocity (returned as part of result)
 * @param smoothTime - Approximate time to reach target (seconds)
 * @param maxSpeed - Maximum speed (use Infinity for no limit)
 * @param deltaTime - Time since last frame (seconds)
 * @returns New value and velocity
 */
export function smoothDamp1D(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): { value: number; velocity: number } {
  smoothTime = Math.max(0.0001, smoothTime)
  const omega = 2 / smoothTime

  const x = omega * deltaTime
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)

  let change = current - target

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime
  change = Math.max(-maxChange, Math.min(maxChange, change))

  const clampedTarget = current - change

  const temp = (velocity + omega * change) * deltaTime
  let newVelocity = (velocity - omega * temp) * exp
  let value = clampedTarget + (change + temp) * exp

  // Prevent overshooting
  if (target - current > 0 === value > target) {
    value = target
    newVelocity = (value - target) / deltaTime
  }

  return { value, velocity: newVelocity }
}

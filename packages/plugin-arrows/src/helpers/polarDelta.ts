import type { Vec2 } from '@woven-canvas/math'

/**
 * Calculate the polar delta (angle and distance change) between two points
 * relative to an origin point.
 *
 * @param start - Starting point
 * @param end - Ending point
 * @param origin - Origin point for polar coordinates
 * @returns Object with angle (in radians) and distance delta
 */
export function polarDelta(start: Vec2, end: Vec2, origin: Vec2): { angle: number; distance: number } {
  const startVec: Vec2 = [start[0] - origin[0], start[1] - origin[1]]
  const endVec: Vec2 = [end[0] - origin[0], end[1] - origin[1]]

  const startAngle = Math.atan2(startVec[1], startVec[0])
  const endAngle = Math.atan2(endVec[1], endVec[0])
  let angle = endAngle - startAngle
  if (angle > Math.PI) angle -= 2 * Math.PI
  if (angle < -Math.PI) angle += 2 * Math.PI

  const startDistance = Math.hypot(startVec[0], startVec[1])
  const endDistance = Math.hypot(endVec[0], endVec[1])
  const distance = endDistance - startDistance

  return { angle, distance }
}

/**
 * Apply a polar delta (angle and distance change) to a position
 * relative to an origin point.
 *
 * @param position - Position to transform
 * @param angle - Angle to rotate (in radians)
 * @param distance - Distance to add
 * @param origin - Origin point for transformation
 * @returns The transformed position
 */
export function applyPolarDelta(position: Vec2, angle: number, distance: number, origin: Vec2): Vec2 {
  const newAngle = Math.atan2(position[1] - origin[1], position[0] - origin[0]) + angle
  const newDistance = Math.hypot(position[0] - origin[0], position[1] - origin[1]) + distance
  return [origin[0] + Math.cos(newAngle) * newDistance, origin[1] + Math.sin(newAngle) * newDistance]
}

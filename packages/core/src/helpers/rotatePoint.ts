export function rotatePoint(point: [number, number], origin: [number, number], angle: number): [number, number] {
  if (angle === 0) return point

  const dx = point[0] - origin[0]
  const dy = point[1] - origin[1]
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [origin[0] + dx * cos - dy * sin, origin[1] + dx * sin + dy * cos]
}

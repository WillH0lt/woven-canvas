export function closestPointToPoint(points: [number, number][], target: [number, number]): [number, number] | null {
  if (points.length === 0) return null

  let closestPoint: [number, number] = points[0]
  let closestDistanceSq = (points[0][0] - target[0]) ** 2 + (points[0][1] - target[1]) ** 2

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distanceSq = (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2
    if (distanceSq < closestDistanceSq) {
      closestDistanceSq = distanceSq
      closestPoint = p
    }
  }

  return closestPoint
}

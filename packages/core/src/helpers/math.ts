export type Mat3 = [number, number, number, number, number, number, number, number, number]

export function multiplyMatrices(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ]
}

export function newTranslationMatrix(tx: number, ty: number): Mat3 {
  return [1, 0, tx, 0, 1, ty, 0, 0, 1]
}

export function newScaleMatrix(sx: number, sy: number): Mat3 {
  return [sx, 0, 0, 0, sy, 0, 0, 0, 1]
}

export function newRotationMatrix(theta: number): Mat3 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

export function transformPoint(m: Mat3, point: [number, number]): [number, number] {
  const [x, y] = point
  return [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]]
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function newRotationMatrixAroundPoint(angle: number, point: [number, number]): Mat3 {
  return multiplyMatrices(
    newTranslationMatrix(point[0], point[1]),
    multiplyMatrices(newRotationMatrix(angle), newTranslationMatrix(-point[0], -point[1])),
  )

  // return transformPoint(M, point)
}

export function approximatelyEqual(a: number, b: number, epsilon = 0.000001): boolean {
  return Math.abs(a - b) < epsilon
}

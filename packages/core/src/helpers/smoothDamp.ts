// https://docs.unity3d.com/ScriptReference/Vector3.SmoothDamp.html
// https://github.com/Unity-Technologies/UnityCsReference/blob/a2bdfe9b3c4cd4476f44bf52f848063bfaf7b6b9/Runtime/Export/Math/Vector3.cs#L97
export function smoothDamp(
  current: [number, number],
  target: [number, number],
  velocity: [number, number],
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number,
): { position: [number, number]; velocity: [number, number] } {
  // Based on Game Programming Gems 4 Chapter 1.10
  smoothTime = Math.max(0.0001, smoothTime)
  const omega = 2 / smoothTime

  const x = omega * deltaTime
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)

  let targetX = target[0]
  let targetY = target[1]

  let changeX = current[0] - targetX
  let changeY = current[1] - targetY

  const originalToX = targetX
  const originalToY = targetY

  // Clamp maximum speed
  const maxChange = maxSpeed * smoothTime

  const maxChangeSq = maxChange * maxChange
  const magnitudeSq = changeX * changeX + changeY * changeY

  if (magnitudeSq > maxChangeSq) {
    const magnitude = Math.sqrt(magnitudeSq)
    changeX = (changeX / magnitude) * maxChange
    changeY = (changeY / magnitude) * maxChange
  }

  targetX = current[0] - changeX
  targetY = current[1] - changeY

  const tempX = (velocity[0] + omega * changeX) * deltaTime
  const tempY = (velocity[1] + omega * changeY) * deltaTime

  const newVelocity: [number, number] = [(velocity[0] - omega * tempX) * exp, (velocity[1] - omega * tempY) * exp]
  // velocity[0] = (velocity[0] - omega * tempX) * exp
  // velocity[1] = (velocity[1] - omega * tempY) * exp

  const position: [number, number] = [targetX + (changeX + tempX) * exp, targetY + (changeY + tempY) * exp]

  // Prevent overshooting
  const origMinusCurrentX = originalToX - current[0]
  const origMinusCurrentY = originalToY - current[1]
  const outMinusOrigX = position[0] - originalToX
  const outMinusOrigY = position[1] - originalToY

  if (origMinusCurrentX * outMinusOrigX + origMinusCurrentY * outMinusOrigY > 0) {
    position[0] = originalToX
    position[1] = originalToY

    newVelocity[0] = (position[0] - originalToX) / deltaTime
    newVelocity[1] = (position[1] - originalToY) / deltaTime
  }

  return { position, velocity: newVelocity }
}

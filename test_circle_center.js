// Test the circle center calculation
// Save as .js file and run with node
function computeCircleCenter(a: [number, number], b: [number, number], c: [number, number]): [number, number] | null {
  const x1 = a[0]
  const y1 = a[1]
  const x2 = b[0]
  const y2 = b[1]
  const x3 = c[0]
  const y3 = c[1]

  // Check if points are collinear (no unique circle can be formed)
  const det = (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  if (Math.abs(det) < 1e-10) {
    return null // Points are collinear
  }

  // Calculate the center using the circumcenter formula
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))

  if (Math.abs(d) < 1e-10) {
    return null // Points are collinear (alternative check)
  }

  const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d
  const uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d

  return [ux, uy]
}

// Test cases
console.log("Test 1: Three points forming a circle centered at origin with radius 1")
const a1: [number, number] = [1, 0]
const b1: [number, number] = [0, 1] 
const c1: [number, number] = [-1, 0]
const center1 = computeCircleCenter(a1, b1, c1)
console.log("Expected center: [0, 0]")
console.log("Actual center:", center1)

console.log("\nTest 2: Three points forming a circle centered at (1, 1)")
const a2: [number, number] = [2, 1]
const b2: [number, number] = [1, 2]
const c2: [number, number] = [0, 1]
const center2 = computeCircleCenter(a2, b2, c2)
console.log("Expected center: [1, 1]")
console.log("Actual center:", center2)

console.log("\nTest 3: Collinear points (should return null)")
const a3: [number, number] = [0, 0]
const b3: [number, number] = [1, 1]
const c3: [number, number] = [2, 2]
const center3 = computeCircleCenter(a3, b3, c3)
console.log("Expected center: null")
console.log("Actual center:", center3)

// Verify distances from center to each point are equal
if (center1) {
  const dist1 = Math.hypot(a1[0] - center1[0], a1[1] - center1[1])
  const dist2 = Math.hypot(b1[0] - center1[0], b1[1] - center1[1])
  const dist3 = Math.hypot(c1[0] - center1[0], c1[1] - center1[1])
  console.log(`\nDistances from center to points: ${dist1.toFixed(6)}, ${dist2.toFixed(6)}, ${dist3.toFixed(6)}`)
}

if (center2) {
  const dist1 = Math.hypot(a2[0] - center2[0], a2[1] - center2[1])
  const dist2 = Math.hypot(b2[0] - center2[0], b2[1] - center2[1])
  const dist3 = Math.hypot(c2[0] - center2[0], c2[1] - center2[1])
  console.log(`Distances from center to points: ${dist1.toFixed(6)}, ${dist2.toFixed(6)}, ${dist3.toFixed(6)}`)
}

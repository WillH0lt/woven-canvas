import type { Mesh } from 'three'

import { LetterMaterial } from '../materials'

// export function copyTextToMaterial(lines: string[], material: LetterMaterial, unicodeMap: Map<number, number>): void {
//   // Clear the character array first
//   const space = unicodeMap.get(' '.charCodeAt(0)) ?? 0

//   const chars = material.chars.value

//   chars.image.data.fill(space)

//   // Fill the grid with characters from the split lines
//   for (let row = 0; row < Math.min(rows, lines.length); row++) {
//     const line = lines[row]

//     for (let col = 0; col < Math.min(cols, line.length); col++) {
//       const gridIndex = row * chars.image.width + col

//       const c = line[col]
//       const unicodeIndex = unicodeMap.get(c.charCodeAt(0)) ?? space
//       chars.image.data[gridIndex] = unicodeIndex
//     }
//   }

//   chars.needsUpdate = true
// }

export function resizeAndMaybeRecreateLetterMaterial(mesh: Mesh, rows: number, cols: number): void {
  let material = mesh.material as LetterMaterial

  const chars = material.chars.value
  const maxRows = chars.image.height
  const maxCols = chars.image.width

  if (rows > maxRows || cols > maxCols) {
    const newRows = growToPowerOfTwo(maxRows, rows, 2048)
    const newCols = growToPowerOfTwo(maxCols, cols, 2048)

    console.log(`Resizing LetterMaterial from ${maxCols}x${maxRows} to ${newCols}x${newRows}`)

    const newMaterial = new LetterMaterial(
      material.fontData,
      material.atlas.value,
      material.unicodeMap,
      newRows,
      newCols,
    )

    const chars = newMaterial.chars.value
    chars.image.data.set(material.chars.value.image.data)
    chars.needsUpdate = true

    const colors = newMaterial.colors.value
    colors.image.data.set(material.colors.value.image.data)
    colors.needsUpdate = true

    mesh.material = newMaterial

    material = newMaterial
  }

  const grid = material.grid.value
  grid.x = cols
  grid.y = rows
}

function growToPowerOfTwo(start: number, min: number, cap: number): number {
  let result = start
  while (result < min) {
    result *= 2
    if (result > cap) {
      result = cap
      break
    }
  }
  return result
}

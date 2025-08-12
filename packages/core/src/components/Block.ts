import { Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '../BaseComponent'
import { multiplyMatrices, newRotationMatrix, newTranslationMatrix, transformPoint } from '../helpers'
import type { Aabb } from './Aabb'
@component
export class Block extends BaseComponent {
  @field.dynamicString(36) public declare id: string
  @field({ type: Type.dynamicString(36), default: 'div' }) public declare tag: string
  @field.float32 declare top: number
  @field.float32 declare left: number
  @field.float32 declare width: number
  @field.float32 declare height: number
  @field.float32 declare rotateZ: number
  @field.dynamicString(36) public declare rank: string
  @field.boolean public declare hasStretched: boolean

  public intersectsPoint(point: [number, number]): boolean {
    const { width, height, left, top, rotateZ } = this

    // Translate point to block's local coordinate system
    const cx = left + width / 2
    const cy = top + height / 2

    const dx = point[0] - cx
    const dy = point[1] - cy

    // Rotate point in opposite direction of block's rotation
    const rad = -rotateZ
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    const localX = dx * cos - dy * sin
    const localY = dx * sin + dy * cos

    // Check if point is within unrotated block bounds
    return localX >= -width / 2 && localX <= width / 2 && localY >= -height / 2 && localY <= height / 2
  }

  public getCenter(): [number, number] {
    const { left, top, width, height } = this
    return [left + width / 2, top + height / 2]
  }

  public getCorners(): [number, number][] {
    const { width, height, rotateZ } = this
    const [cx, cy] = this.getCenter()

    const halfWidth = width / 2
    const halfHeight = height / 2

    // Local corners (before rotation)
    const corners: [number, number][] = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
    ]

    const R = newRotationMatrix(rotateZ)
    const D = newTranslationMatrix(cx, cy)
    const M = multiplyMatrices(D, R)

    return corners.map(([x, y]) => {
      return transformPoint(M, [x, y])
    })

    // // Rotate and translate corners
    // const cos = Math.cos(rotateZ)
    // const sin = Math.sin(rotateZ)

    // return corners.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos])
  }

  public intersectsAabb(aabb: Aabb): boolean {
    // Use Separating Axis Theorem (SAT) between AABB and oriented rectangle

    // Get corners of the AABB
    const aabbCorners: [number, number][] = [
      [aabb.left, aabb.top],
      [aabb.right, aabb.top],
      [aabb.right, aabb.bottom],
      [aabb.left, aabb.bottom],
    ]

    // Get corners of the oriented block
    const blockCorners = this.getCorners()

    // Test axes from AABB (just X and Y axes since AABB is axis-aligned)
    const aabbAxes: [number, number][] = [
      [1, 0],
      [0, 1],
    ]

    // Test axes from block (normals of its edges)
    const blockAxes: [number, number][] = []
    for (let i = 0; i < 4; i++) {
      const edge = [
        blockCorners[(i + 1) % 4][0] - blockCorners[i][0],
        blockCorners[(i + 1) % 4][1] - blockCorners[i][1],
      ]
      // Get perpendicular (normal) and normalize
      const length = Math.sqrt(edge[1] * edge[1] + edge[0] * edge[0])
      if (length > 0) {
        blockAxes.push([-edge[1] / length, edge[0] / length])
      }
    }

    // Test all axes
    const allAxes = [...aabbAxes, ...blockAxes]

    for (const axis of allAxes) {
      // Project AABB onto axis
      const aabbProjection = projectRectangleOntoAxis(aabbCorners, axis)

      // Project block onto axis
      const blockProjection = projectRectangleOntoAxis(blockCorners, axis)

      // Check for separation
      if (aabbProjection.max < blockProjection.min || blockProjection.max < aabbProjection.min) {
        return false // Separating axis found
      }
    }

    return true // No separating axis found, shapes intersect
  }
}

function projectRectangleOntoAxis(corners: [number, number][], axis: [number, number]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const corner of corners) {
    const projection = corner[0] * axis[0] + corner[1] * axis[1]
    min = Math.min(min, projection)
    max = Math.max(max, projection)
  }

  return { min, max }
}

import { component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '../BaseComponent'
import type { Block } from './Block'
import type { HitCapsule } from './HitCapsule'

@component
export class Aabb extends BaseComponent {
  @field.float32 public declare left: number
  @field.float32 public declare right: number
  @field.float32 public declare top: number
  @field.float32 public declare bottom: number

  public containsPoint(point: [number, number], inclusive = true): boolean {
    if (inclusive) {
      return point[0] >= this.left && point[0] <= this.right && point[1] >= this.top && point[1] <= this.bottom
    }
    return point[0] > this.left && point[0] < this.right && point[1] > this.top && point[1] < this.bottom
  }

  public expandByPoint(point: [number, number]): this {
    this.left = Math.min(this.left, point[0])
    this.right = Math.max(this.right, point[0])
    this.top = Math.min(this.top, point[1])
    this.bottom = Math.max(this.bottom, point[1])

    return this
  }

  public expandByBlock(block: Block): this {
    const aabb = block.computeAabb()
    this.expandByPoint([aabb.left, aabb.top])
    this.expandByPoint([aabb.right, aabb.bottom])
    return this
  }

  public setByPoints(points: [number, number][]): this {
    if (points.length === 0) return this
    const pt = points[0]
    this.left = pt[0]
    this.right = pt[0]
    this.top = pt[1]
    this.bottom = pt[1]

    for (let i = 1; i < points.length; i++) {
      this.expandByPoint(points[i])
    }

    return this
  }

  public getCenter(): [number, number] {
    return [(this.left + this.right) / 2, (this.top + this.bottom) / 2]
  }

  public getWidth(): number {
    return this.right - this.left
  }

  public getHeight(): number {
    return this.bottom - this.top
  }

  public distanceToPoint(point: [number, number]): number {
    const dx = Math.max(this.left - point[0], 0, point[0] - this.right)
    const dy = Math.max(this.top - point[1], 0, point[1] - this.bottom)
    return Math.hypot(dx, dy)
  }

  public intersectsAabb(other: Aabb): boolean {
    return !(this.right < other.left || this.left > other.right || this.bottom < other.top || this.top > other.bottom)
  }

  public surroundsAabb(other: Aabb): boolean {
    return this.left <= other.left && this.top <= other.top && this.right >= other.right && this.bottom >= other.bottom
  }

  public intersectsBlock(block: Block): boolean {
    return block.intersectsAabb(this)
  }

  public intersectsCapsule(capsule: HitCapsule): boolean {
    return capsule.intersectsAabb(this)
  }

  public getCorners(): [number, number][] {
    return [
      [this.left, this.top],
      [this.right, this.top],
      [this.right, this.bottom],
      [this.left, this.bottom],
    ]
  }

  public applyPadding(padding: number): this {
    this.left -= padding
    this.right += padding
    this.top -= padding
    this.bottom += padding
    return this
  }
}

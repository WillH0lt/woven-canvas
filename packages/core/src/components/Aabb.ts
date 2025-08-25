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

  public containsPoint(point: [number, number]): boolean {
    return point[0] >= this.left && point[0] <= this.right && point[1] >= this.top && point[1] <= this.bottom
  }

  public expandByPoint(point: [number, number]): this {
    this.left = Math.min(this.left, point[0])
    this.right = Math.max(this.right, point[0])
    this.top = Math.min(this.top, point[1])
    this.bottom = Math.max(this.bottom, point[1])

    return this
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
}

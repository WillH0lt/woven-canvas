import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import {
  Aabb,
  Block,
  HitCapsule,
  Opacity,
  Persistent,
  RankBounds,
  allHitGeometriesArray,
} from '@infinitecanvas/core/components'
import { intersectCapsule } from '@infinitecanvas/core/helpers'
import type { Entity } from '@lastolivegames/becsy'

import { EraserStroke } from '../components'
import { Erased } from '../components/Erased'
import { POINTS_CAPACITY, STROKE_RADIUS } from '../constants'
import { EraserCommand, type EraserCommandArgs } from '../types'

export class UpdateEraser extends BaseSystem<EraserCommandArgs & CoreCommandArgs> {
  private readonly rankBounds = this.singleton.write(RankBounds)

  private readonly _strokes = this.query((q) => q.using(EraserStroke, Block, Aabb, Opacity).write)

  private readonly erasedBlocks = this.query((q) => q.using(Erased).write)

  private readonly blocks = this.query((q) => q.current.with(Block, Persistent).using(...allHitGeometriesArray).read)

  public initialize(): void {
    this.addCommandListener(EraserCommand.AddStroke, this.addStroke.bind(this))
    this.addCommandListener(EraserCommand.AddStrokePoint, this.addStrokePoint.bind(this))
    this.addCommandListener(EraserCommand.CancelStroke, this.cancelStroke.bind(this))
    this.addCommandListener(EraserCommand.CompleteStroke, this.completeStroke.bind(this))
  }

  private addStroke(strokeEntity: Entity, position: [number, number]): void {
    const block = {
      tag: 'ic-eraser-stroke',
      id: crypto.randomUUID(),
      rank: this.rankBounds.genNext().toString(),
      left: position[0] - STROKE_RADIUS,
      top: position[1] - STROKE_RADIUS,
      width: STROKE_RADIUS * 2,
      height: STROKE_RADIUS * 2,
    }

    strokeEntity.add(Block, block)

    const points = new Array(POINTS_CAPACITY).fill(0)

    points[0] = position[0]
    points[1] = position[1]

    strokeEntity.add(EraserStroke, {
      points,
      pointCount: 1,
    })
  }

  private addStrokePoint(strokeEntity: Entity, point: [number, number]): void {
    const stroke = strokeEntity.write(EraserStroke)

    const nextIndex = (stroke.pointCount * 2) % POINTS_CAPACITY

    // if (nextIndex >= POINTS_CAPACITY) return

    stroke.points[nextIndex] = point[0]
    stroke.points[nextIndex + 1] = point[1]

    stroke.pointCount++

    if (stroke.pointCount > 10) {
      stroke.firstPointIndex++
    }

    const aabb = strokeEntity.write(Aabb)
    if (!aabb.containsPoint(point)) {
      aabb.expandByPoint(point)

      const block = strokeEntity.write(Block)
      block.left = aabb.left
      block.top = aabb.top
      block.width = aabb.right - aabb.left
      block.height = aabb.bottom - aabb.top
    }

    const capsule = new HitCapsule({
      a: [stroke.points[nextIndex - 2], stroke.points[nextIndex - 1]],
      b: [stroke.points[nextIndex], stroke.points[nextIndex + 1]],
      radius: STROKE_RADIUS,
    })

    const intersections = intersectCapsule(capsule, this.blocks.current)

    for (const intersect of intersections) {
      this.setComponent(intersect, Erased, { eraserStroke: strokeEntity })
      this.setComponent(intersect, Opacity, { value: 50 })
    }
  }

  private cancelStroke(strokeEntity: Entity): void {
    const eraserStroke = strokeEntity.read(EraserStroke)

    const erasedBlocks = [...eraserStroke.erasedBlocks]
    for (const erasedBlock of erasedBlocks) {
      this.unsetComponent(erasedBlock, Erased)
      this.unsetComponent(erasedBlock, Opacity)
    }

    this.deleteEntity(strokeEntity)
  }

  private completeStroke(strokeEntity: Entity): void {
    const eraserStroke = strokeEntity.read(EraserStroke)

    for (const erasedBlock of eraserStroke.erasedBlocks) {
      if (!erasedBlock.alive) continue
      this.deleteEntity(erasedBlock)
    }

    this.deleteEntity(strokeEntity)

    if (eraserStroke.erasedBlocks.length > 0) {
      this.emitCommand(CoreCommand.CreateCheckpoint)
    }
  }
}

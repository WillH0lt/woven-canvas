import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import { Aabb, Block, HitCapsule, HitGeometries, Persistent, RankBounds } from '@infinitecanvas/core/components'
import {
  multiplyMatrices,
  newRotationMatrix,
  newScaleMatrix,
  newTranslationMatrix,
  transformPoint,
} from '@infinitecanvas/core/helpers'
import { Color } from '@infinitecanvas/extension-color'
import { type Entity, co } from '@lastolivegames/becsy'
import simplify from 'simplify-js'

import { Stroke } from '../components'
import { POINTS_CAPACITY } from '../constants'
import { InkCommand, type InkCommandArgs } from '../types'

export class UpdateStroke extends BaseSystem<InkCommandArgs & CoreCommandArgs> {
  private readonly rankBounds = this.singleton.write(RankBounds)

  private readonly strokes = this.query(
    (q) =>
      q.addedOrChanged
        .with(Stroke, Block)
        .write.trackWrites.with(Color, Persistent)
        .write.using(Aabb, HitGeometries, HitCapsule).write,
  )

  public initialize(): void {
    this.addCommandListener(InkCommand.AddStroke, this.addStroke.bind(this))
    this.addCommandListener(InkCommand.AddStrokePoint, this.addStrokePoint.bind(this))
    this.addCommandListener(InkCommand.CompleteStroke, this.completeStroke.bind(this))
    this.addCommandListener(InkCommand.RemoveStroke, this.removeStroke.bind(this))
  }

  public execute(): void {
    for (const strokeEntity of this.strokes.addedOrChanged) {
      const stroke = strokeEntity.read(Stroke)

      if (!stroke.isComplete) continue

      this.addOrUpdateHitGeometry(strokeEntity)
    }

    this.executeCommands()
  }

  private addStroke(strokeEntity: Entity, position: [number, number]): void {
    const radius = 4

    const block = {
      tag: 'ic-ink-stroke',
      id: crypto.randomUUID(),
      rank: this.rankBounds.genNext().toString(),
      left: position[0] - radius,
      top: position[1] - radius,
      width: radius * 2,
      height: radius * 2,
    }

    strokeEntity.add(Block, block)
    strokeEntity.add(Persistent)

    const points = new Array(POINTS_CAPACITY).fill(0)

    points[0] = position[0]
    points[1] = position[1]

    strokeEntity.add(Stroke, {
      points,
      pointCount: 1,
      originalLeft: block.left,
      originalTop: block.top,
      originalWidth: block.width,
      originalHeight: block.height,
      thickness: radius * 2,
    })

    strokeEntity.add(Color)
  }

  private addStrokePoint(strokeEntity: Entity, point: [number, number]): void {
    const stroke = strokeEntity.write(Stroke)

    const nextIndex = stroke.pointCount

    if (nextIndex * 2 >= POINTS_CAPACITY) return

    stroke.points[nextIndex * 2] = point[0]
    stroke.points[nextIndex * 2 + 1] = point[1]
    stroke.pointCount++

    const aabb = strokeEntity.write(Aabb)
    if (!aabb.containsPoint(point)) {
      aabb.expandByPoint(point)

      const block = strokeEntity.write(Block)
      block.left = aabb.left
      block.top = aabb.top
      block.width = aabb.right - aabb.left
      block.height = aabb.bottom - aabb.top

      stroke.originalLeft = block.left
      stroke.originalTop = block.top
      stroke.originalWidth = block.width
      stroke.originalHeight = block.height
    }
  }

  private completeStroke(strokeEntity: Entity): void {
    const stroke = strokeEntity.write(Stroke)
    stroke.isComplete = true
    this.emitCommand(CoreCommand.CreateCheckpoint)
  }

  private removeStroke(strokeEntity: Entity): void {
    this.deleteEntity(strokeEntity)
  }

  @co private *addOrUpdateHitGeometry(strokeEntity: Entity): Generator {
    const heldStrokeEntity = strokeEntity.hold()
    co.scope(heldStrokeEntity)
    co.cancelIfCoroutineStarted()

    yield co.waitForSeconds(0.25)

    if (!heldStrokeEntity?.alive || !heldStrokeEntity.has(Stroke)) return

    if (!heldStrokeEntity.has(HitGeometries)) {
      heldStrokeEntity.add(HitGeometries)
    }

    const hitGeometries = heldStrokeEntity.read(HitGeometries)
    this.deleteEntities(hitGeometries.capsules)

    const stroke = heldStrokeEntity.read(Stroke)
    const block = heldStrokeEntity.read(Block)

    const points: { x: number; y: number }[] = []
    for (let i = 0; i < stroke.pointCount; i++) {
      points.push({
        x: stroke.points[i * 2],
        y: stroke.points[i * 2 + 1],
      })
    }

    const simplifiedPoints = simplify(points, stroke.thickness, false)

    // add a second point so the hit capsule gets created
    if (simplifiedPoints.length === 1) {
      const pt = simplifiedPoints[0]
      simplifiedPoints.push({
        x: pt.x,
        y: pt.y,
      })
    }

    // Compose an affine transform matrix to map original stroke points to current block position/size/rotation.
    // M = T(currentCenter) * R(theta) * S(scaleX, scaleY) * T(-originalCenter)
    const angle = block.rotateZ

    const currW = block.width
    const currH = block.height
    const origW = stroke.originalWidth
    const origH = stroke.originalHeight

    const sx = currW / origW
    const sy = currH / origH

    const cx0 = stroke.originalLeft + origW / 2
    const cy0 = stroke.originalTop + origH / 2
    const cx1 = block.left + currW / 2
    const cy1 = block.top + currH / 2

    const M = multiplyMatrices(
      newTranslationMatrix(cx1, cy1),
      multiplyMatrices(
        newRotationMatrix(angle),
        multiplyMatrices(newScaleMatrix(sx, sy), newTranslationMatrix(-cx0, -cy0)),
      ),
    )

    // transform simplifiedPoints via M into transformedPoints
    const transformedPoints: number[] = []
    for (let i = 0; i < simplifiedPoints.length; i++) {
      const { x, y } = simplifiedPoints[i]
      const p = transformPoint(M, [x, y])
      transformedPoints.push(p[0], p[1])
    }

    // create hit capsules from transformedPoints
    for (let i = 0; i < transformedPoints.length - 3; i += 2) {
      this.createEntity(HitCapsule, {
        a: [transformedPoints[i], transformedPoints[i + 1]],
        b: [transformedPoints[i + 2], transformedPoints[i + 3]],
        radius: stroke.thickness * 2,
        blockEntity: strokeEntity,
      })
    }
  }
}

import { BaseSystem, type CoreCommandArgs } from '@infinitecanvas/core'
import {
  Block,
  Color,
  Connector,
  HitArc,
  HitCapsule,
  HitGeometries,
  Persistent,
  Text,
  allHitGeometriesArray,
} from '@infinitecanvas/core/components'
import type { Entity } from '@lastolivegames/becsy'

import { Arrow, ArrowTrim } from '../components'
import { arcIntersectEntity, closestPointToPoint } from '../helpers'
import type { ArrowCommandArgs } from '../types'
import { UpdateArrowTransform } from './UpdateArrowTransform'

export class UpdateArrowHitGeometry extends BaseSystem<ArrowCommandArgs & CoreCommandArgs> {
  private readonly arrows = this.query(
    (q) =>
      q.current.addedOrChanged
        .with(Arrow, Block, Connector)
        .write.trackWrites.using(HitGeometries, HitArc, HitCapsule, Persistent, Color, Text, ArrowTrim)
        .write.using(...allHitGeometriesArray).read,
  )

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateArrowTransform))
  }

  public execute(): void {
    for (const arrowEntity of this.arrows.addedOrChanged) {
      this.addOrUpdateHitGeometry(arrowEntity)
    }
  }

  private addOrUpdateHitGeometry(arrowEntity: Entity): void {
    if (!arrowEntity.has(HitGeometries)) {
      arrowEntity.add(HitGeometries)
    }

    if (!arrowEntity.has(ArrowTrim)) {
      arrowEntity.add(ArrowTrim)
    }

    const hitGeometries = arrowEntity.read(HitGeometries)

    const arrow = arrowEntity.read(Arrow)
    const block = arrowEntity.read(Block)

    const minThickness = 20

    if (arrow.isCurved()) {
      for (const capsule of hitGeometries.capsules) {
        capsule.delete()
      }

      const a = block.uvToWorld(arrow.a)
      const b = block.uvToWorld(arrow.b)
      const c = block.uvToWorld(arrow.c)

      let arcEntity: Entity | undefined
      if (hitGeometries.arcs.length > 0) {
        arcEntity = hitGeometries.arcs[0]
      } else {
        arcEntity = this.createEntity(HitArc, { blockEntity: arrowEntity })
      }

      const hitArc = arcEntity.write(HitArc)
      hitArc.thickness = Math.max(arrow.thickness, minThickness)
      hitArc.update(a, b, c)
    } else {
      for (const arc of hitGeometries.arcs) {
        arc.delete()
      }

      const a = block.uvToWorld(arrow.a)
      const c = block.uvToWorld(arrow.c)

      let hitCapsuleEntity: Entity | undefined
      if (hitGeometries.capsules.length > 0) {
        hitCapsuleEntity = hitGeometries.capsules[0]
      } else {
        hitCapsuleEntity = this.createEntity(HitCapsule, { blockEntity: arrowEntity })
      }

      const hitCapsule = hitCapsuleEntity.write(HitCapsule)
      hitCapsule.radius = Math.max(arrow.thickness / 2, minThickness / 2)

      hitCapsule.a = a
      hitCapsule.b = c
    }

    this.updateArrowTrim(arrowEntity)
  }

  private updateArrowTrim(arrowEntity: Entity): void {
    const connector = arrowEntity.read(Connector)
    const arrow = arrowEntity.read(Arrow)

    const arrowBlock = arrowEntity.read(Block)
    const aWorld = arrowBlock.uvToWorld(arrow.a)
    const cWorld = arrowBlock.uvToWorld(arrow.c)

    if (!arrowEntity.has(ArrowTrim)) {
      arrowEntity.add(ArrowTrim)
    }
    const trim = arrowEntity.write(ArrowTrim)

    const hitGeometries = arrowEntity.read(HitGeometries)
    const arc = hitGeometries.arcs.length > 0 ? hitGeometries.arcs[0].write(HitArc) : null
    const capsule = hitGeometries.capsules.length > 0 ? hitGeometries.capsules[0].write(HitCapsule) : null

    const startTrim = this.calculateTrim(connector.startBlockEntity, arc, capsule, aWorld, 0)
    const endTrim = this.calculateTrim(connector.endBlockEntity, arc, capsule, cWorld, 1)

    trim.tStart = startTrim
    trim.tEnd = endTrim

    // reset if the trim is too small
    if (endTrim - startTrim < 0.1) {
      trim.tStart = 0
      trim.tEnd = 1
    }

    // trim the hit geometry
    if (arc) {
      arc.trim(trim.tStart, trim.tEnd)
    } else if (capsule) {
      capsule.trim(trim.tStart, trim.tEnd)
    }
  }

  private calculateTrim(
    blockEntity: Entity | undefined,
    hitArc: Readonly<HitArc> | null,
    capsule: Readonly<HitCapsule> | null,
    referencePoint: [number, number],
    defaultValue: number,
  ): number {
    if (!blockEntity || !blockEntity.has(Block)) return defaultValue

    const block = blockEntity.read(Block)
    let points: [number, number][] = []

    if (hitArc) {
      points = arcIntersectEntity(hitArc, blockEntity)
    } else if (capsule) {
      points = capsule.centerLineIntersectBlock(block)
    }

    const intersect = closestPointToPoint(points, referencePoint)

    if (!intersect) return defaultValue

    let t: number | null = null
    if (hitArc) {
      t = hitArc.pointToParametric(intersect)
    } else if (capsule) {
      t = capsule.pointToParametric(intersect)
    }

    return t ?? defaultValue
  }
}

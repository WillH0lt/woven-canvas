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

import { ArcArrow, ArrowTrim, ElbowArrow } from '../components'
import { arcIntersectEntity, closestPointToPoint } from '../helpers'
import type { ArrowCommandArgs } from '../types'
import { UpdateArrowTransform } from './UpdateArrowTransform'

export class UpdateArrowHitGeometry extends BaseSystem<ArrowCommandArgs & CoreCommandArgs> {
  private readonly arrows = this.query(
    (q) =>
      q.current.addedOrChanged
        .with(Block, Connector)
        .write.trackWrites.withAny(ArcArrow, ElbowArrow)
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

    if (arrowEntity.has(ElbowArrow)) {
      // currently no hit geometry for elbow arrows
      // return
      const capsuleEntities = this.updateElbowArrowHitGeometry(arrowEntity)
      this.updateElbowArrowTrim(arrowEntity, capsuleEntities)
    } else if (arrowEntity.has(ArcArrow)) {
      this.updateArcArrowHitGeometry(arrowEntity)
      this.updateArcArrowTrim(arrowEntity)
    }
  }

  private updateArcArrowHitGeometry(arrowEntity: Entity): void {
    const hitGeometries = arrowEntity.read(HitGeometries)

    const arrow = arrowEntity.read(ArcArrow)
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
  }

  private updateElbowArrowHitGeometry(arrowEntity: Entity): Entity[] {
    const hitGeometries = arrowEntity.read(HitGeometries)

    const arrow = arrowEntity.read(ElbowArrow)
    const block = arrowEntity.read(Block)

    const minThickness = 20

    const capsules = hitGeometries.capsules

    const lines: [[number, number], [number, number]][] = []

    for (let i = 0; i < arrow.pointCount - 1; i++) {
      const p0 = block.uvToWorld(arrow.getPoint(i))
      const p1 = block.uvToWorld(arrow.getPoint(i + 1))
      lines.push([p0, p1])
    }

    const hitCapsuleEntities: Entity[] = []
    for (let i = 0; i < lines.length; i++) {
      let hitCapsuleEntity: Entity
      if (i < capsules.length) {
        hitCapsuleEntity = capsules[i]
      } else {
        hitCapsuleEntity = this.createEntity(HitCapsule, { blockEntity: arrowEntity })
      }

      hitCapsuleEntities.push(hitCapsuleEntity)
      const hitCapsule = hitCapsuleEntity.write(HitCapsule)
      hitCapsule.radius = Math.max(arrow.thickness / 2, minThickness / 2)
      const [a, b] = lines[i]
      hitCapsule.a = a
      hitCapsule.b = b
    }

    // remove any extra capsules
    for (let i = lines.length; i < capsules.length; i++) {
      capsules[i].delete()
    }

    return hitCapsuleEntities
  }

  private updateArcArrowTrim(arrowEntity: Entity): void {
    const connector = arrowEntity.read(Connector)
    const arrow = arrowEntity.read(ArcArrow)

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

    let startTrim: number
    let endTrim: number
    if (arc) {
      startTrim = this.calculateArcTrim(connector.startBlockEntity, arc, aWorld, 0)
      endTrim = this.calculateArcTrim(connector.endBlockEntity, arc, cWorld, 1)
    } else if (capsule) {
      startTrim = this.calculateCapsuleTrim(connector.startBlockEntity, capsule, aWorld, 0)
      endTrim = this.calculateCapsuleTrim(connector.endBlockEntity, capsule, cWorld, 1)
    } else {
      startTrim = 0
      endTrim = 1
    }

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

  private updateElbowArrowTrim(arrowEntity: Entity, capsuleEntities: Entity[]): void {
    const connector = arrowEntity.read(Connector)
    const arrow = arrowEntity.read(ElbowArrow)

    const arrowBlock = arrowEntity.read(Block)

    const start = arrowBlock.uvToWorld(arrow.getPoint(0))
    const end = arrowBlock.uvToWorld(arrow.getPoint(arrow.pointCount - 1))

    if (!arrowEntity.has(ArrowTrim)) {
      arrowEntity.add(ArrowTrim)
    }
    const trim = arrowEntity.write(ArrowTrim)

    if (capsuleEntities.length < 2) {
      trim.tStart = 0
      trim.tEnd = 1
      return
    }

    const startCapsule = capsuleEntities[0].write(HitCapsule)
    const startTrim = this.calculateCapsuleTrim(connector.startBlockEntity, startCapsule, start, 0)
    startCapsule.trim(startTrim, 1)

    const endCapsule = capsuleEntities[capsuleEntities.length - 1].write(HitCapsule)
    const endTrim = this.calculateCapsuleTrim(connector.endBlockEntity, endCapsule, end, 1)
    endCapsule.trim(0, endTrim)

    trim.tStart = startTrim
    trim.tEnd = endTrim
  }

  private calculateArcTrim(
    blockEntity: Entity | undefined,
    arc: Readonly<HitArc>,
    referencePoint: [number, number],
    defaultValue: number,
  ): number {
    if (!blockEntity || !blockEntity.has(Block)) return defaultValue

    let points: [number, number][] = []

    points = arcIntersectEntity(arc, blockEntity)

    const intersect = closestPointToPoint(points, referencePoint)

    if (!intersect) return defaultValue

    const t = arc.pointToParametric(intersect)

    return t ?? defaultValue
  }

  private calculateCapsuleTrim(
    blockEntity: Entity | undefined,
    capsule: Readonly<HitCapsule>,
    referencePoint: [number, number],
    defaultValue: number,
  ): number {
    if (!blockEntity || !blockEntity.has(Block)) return defaultValue

    const block = blockEntity.read(Block)
    let points: [number, number][] = []

    points = capsule.centerLineIntersectBlock(block)

    const intersect = closestPointToPoint(points, referencePoint)

    if (!intersect) return defaultValue

    const t = capsule.pointToParametric(intersect)

    return t ?? defaultValue
  }
}

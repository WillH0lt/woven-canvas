import { BaseSystem, type CoreCommandArgs } from '@infinitecanvas/core'
import { Block, Persistent, RankBounds } from '@infinitecanvas/core/components'
import { Color } from '@infinitecanvas/extension-color'
import { Text } from '@infinitecanvas/extension-text'
import type { Entity } from '@lastolivegames/becsy'
import { Arrow } from '../components'
import { ArrowCommand, type ArrowCommandArgs } from '../types'

export class UpdateArrowDraw extends BaseSystem<ArrowCommandArgs & CoreCommandArgs> {
  private readonly rankBounds = this.singleton.write(RankBounds)

  private readonly _arrows = this.query((q) => q.using(Block, Persistent, Color, Text, Arrow).write)

  public initialize(): void {
    this.addCommandListener(ArrowCommand.AddArrow, this.addArrow.bind(this))
    this.addCommandListener(ArrowCommand.DragArrow, this.dragArrow.bind(this))
    this.addCommandListener(ArrowCommand.RemoveArrow, this.removeArrow.bind(this))
  }

  private addArrow(arrowEntity: Entity, position: [number, number]): void {
    const radius = 4

    const block = {
      tag: 'ic-arrow',
      id: crypto.randomUUID(),
      rank: this.rankBounds.genNext().toString(),
      left: position[0] - radius,
      top: position[1] - radius,
      width: radius * 2,
      height: radius * 2,
    }

    arrowEntity.add(Block, block)
    arrowEntity.add(Persistent)

    arrowEntity.add(Arrow, {
      a: [0, 0],
      b: [0.5, 0.5],
      c: [1, 1],
      diameter: radius * 2,
    })

    arrowEntity.add(Color)
    arrowEntity.add(Text)
  }

  private dragArrow(arrowEntity: Entity, start: [number, number], end: [number, number]): void {
    const block = arrowEntity.write(Block)
    block.left = Math.min(start[0], end[0])
    block.top = Math.min(start[1], end[1])
    block.width = Math.abs(start[0] - end[0])
    block.height = Math.abs(start[1] - end[1])

    // arrow a and b are in uv coordinates
    const arrow = arrowEntity.write(Arrow)
    const ax = start[0] < end[0] ? 0 : 1
    const ay = start[1] < end[1] ? 0 : 1
    arrow.a = [ax, ay]
    arrow.c = [1 - ax, 1 - ay]
  }

  private removeArrow(arrowEntity: Entity): void {
    this.deleteEntity(arrowEntity)
  }
}

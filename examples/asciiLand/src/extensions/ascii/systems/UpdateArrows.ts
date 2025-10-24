import { BaseSystem } from '@infinitecanvas/core'
import { Block, Color } from '@infinitecanvas/core/components'
import { ArrowCommand, type ArrowCommandArgs, ElbowArrow } from '@infinitecanvas/extension-arrows'
import type { Mesh } from 'three'

import type { LetterMaterial } from '../materials'
import type { AsciiResources } from '../types'
import { UpdateEnforceGrid } from './UpdateEnforceGrid'

export class UpdateArrows extends BaseSystem<ArrowCommandArgs> {
  protected declare readonly resources: AsciiResources

  private readonly arrows = this.query((q) => q.current.with(ElbowArrow, Block, Color))

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateEnforceGrid))
  }

  public initialize(): void {
    this.addCommandListener(ArrowCommand.ShowTransformHandles, this.showTransformHandles.bind(this))
    this.addCommandListener(ArrowCommand.HideTransformHandles, this.hideTransformHandles.bind(this))
  }

  public showTransformHandles(): void {
    for (const arrowEntity of this.arrows.current) {
      const block = arrowEntity.read(Block)
      const arrow = arrowEntity.read(ElbowArrow)

      if (arrow.pointCount < 2) continue

      const a = arrow.getPoint(0)
      const b = arrow.getPoint(arrow.pointCount - 1)

      const mesh = this.resources.scene.getObjectByName(block.id) as Mesh | undefined
      if (!mesh) continue

      const material = mesh.material as LetterMaterial

      const color = new Color({
        red: 255,
        green: 0,
        blue: 0,
        alpha: 255,
      })

      material.setColorAtUv(color, a)
      material.setColorAtUv(color, b)
    }
  }

  public hideTransformHandles(): void {
    console.log('Hide arrow transform handles called')
  }
}

import { BaseSystem } from '@infinitecanvas/core'
import { Selected } from '@infinitecanvas/core/components'

import { Shape } from '../components'
import { AsciiCommand, type AsciiCommandArgs, type AsciiResources } from '../types'
import { UpdateCopyText } from './UpdateCopyText'
import { UpdateEnforceGrid } from './UpdateEnforceGrid'

export class UpdateShapes extends BaseSystem<AsciiCommandArgs> {
  protected declare readonly resources: AsciiResources

  private readonly selectedShapes = this.query((q) => q.current.with(Shape).write.and.with(Selected))

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateEnforceGrid, UpdateCopyText))
  }

  public initialize(): void {
    this.addCommandListener(AsciiCommand.ApplyShapeStyleToSelected, this.applyShapeStyleToSelected.bind(this))
  }

  public applyShapeStyleToSelected(style: string): void {
    for (const shapeEntity of this.selectedShapes.current) {
      const shape = shapeEntity.write(Shape)
      shape.style = style
    }
  }
}

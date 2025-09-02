import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import { Block, Cursor, Hovered } from '@infinitecanvas/core/components'
import { TransformHandle } from '../components'
import { getCursorSvg } from '../cursors'
import type { TransformResources } from '../types'
import { CaptureTransformBox } from './CaptureTransformBox'

export class CaptureHoverCursor extends BaseSystem<CoreCommandArgs> {
  protected readonly resources!: TransformResources

  private readonly hovered = this.query((q) =>
    q.addedOrChanged.current.removed.with(Block).trackWrites.and.with(Hovered, TransformHandle),
  )

  private readonly cursor = this.singleton.read(Cursor)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureTransformBox))
  }

  public execute(): void {
    // remove context cursor when unhovering
    if (this.hovered.current.length === 0 && this.hovered.removed.length > 0) {
      this.emitCommand(CoreCommand.SetCursor, {
        contextSvg: '',
      })
    }

    // add context cursor when hovering
    for (const hoveredEntity of this.hovered.addedOrChanged) {
      const transformHandle = hoveredEntity.read(TransformHandle)
      const block = hoveredEntity.read(Block)
      const contextSvg = getCursorSvg(transformHandle.cursorKind, block.rotateZ)

      if (contextSvg === this.cursor.contextSvg) continue

      this.emitCommand(CoreCommand.SetCursor, {
        contextSvg,
      })
    }
  }
}

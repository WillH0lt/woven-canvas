import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { BlockCommand, type BlockCommandArgs } from '../types'
import { CaptureSelection } from './CaptureSelection'

export class CaptureTransformBox extends BaseSystem<BlockCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly selectedBlocks = this.query((q) => q.added.removed.current.with(comps.Block, comps.Selected))

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelection))
  }

  public execute(): void {
    if (this.selectedBlocks.added.length || this.selectedBlocks.removed.length) {
      if (this.selectedBlocks.current.length === 0) {
        this.emitCommand(BlockCommand.RemoveTransformBox)
      } else {
        this.emitCommand(BlockCommand.AddOrReplaceTransformBox)
      }
    } else if (this.selectedBlocks.current.length) {
      if (this.pointer.upTrigger) {
        this.emitCommand(BlockCommand.AddOrReplaceTransformBox)
      } else if (this.pointer.downTrigger) {
        this.emitCommand(BlockCommand.HideTransformBox)
      }
    }
  }
}

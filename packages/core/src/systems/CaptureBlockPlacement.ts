import { Block } from '@infinitecanvas/core/components'
import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs, PointerButton } from '../types'

export class CaptureBlockPlacement extends BaseSystem<CoreCommandArgs> {
  public execute(): void {
    if (!this.controls.heldSnapshot) return

    const pointerEvents = this.getPointerEvents([PointerButton.Left])
    if (pointerEvents.length === 0) return

    const pointerUpEvent = pointerEvents.find((e) => e.type === 'pointerUp')
    if (!pointerUpEvent) return

    const snapshot = JSON.parse(this.controls.heldSnapshot)

    const blockId = Object.keys(snapshot)[0]

    const block = new Block(snapshot[blockId].Block)

    snapshot[blockId].Block.left = pointerUpEvent.worldPosition[0] - block.width / 2
    snapshot[blockId].Block.top = pointerUpEvent.worldPosition[1] - block.height / 2

    this.emitCommand(CoreCommand.CreateFromSnapshot, snapshot)
    this.emitCommand(CoreCommand.SetControls, {
      leftMouseTool: 'select',
      heldSnapshot: '',
    })
  }
}

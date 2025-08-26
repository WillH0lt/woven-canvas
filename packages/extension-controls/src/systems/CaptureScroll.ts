import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'

import { CapturePan } from './CapturePan'
import { CaptureZoom } from './CaptureZoom'

export class CaptureScroll extends BaseSystem<CoreCommandArgs> {
  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CapturePan, CaptureZoom))
  }

  public execute(): void {
    const active = this.controls.wheelActive('scroll', this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents(this.mouse, this.camera, this.intersect)

    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const top = this.camera.top + (1 * wheelEvent.wheelDelta) / this.camera.zoom
    this.emitCommand(CoreCommand.MoveCamera, {
      x: this.camera.left,
      y: top,
    })
  }
}

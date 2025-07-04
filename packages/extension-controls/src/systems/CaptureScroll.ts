import { BaseSystem, BlockCommand, type BlockCommandArgs, comps } from '@infinitecanvas/core'
import type { ControlCommandArgs } from '../types'
import { CapturePan } from './CapturePan'
import { CaptureSelect } from './CaptureSelect'
import { CaptureTransformBox } from './CaptureTransformBox'
import { CaptureZoom } from './CaptureZoom'

export class CaptureScroll extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelect, CapturePan, CaptureTransformBox, CaptureZoom))
  }

  public execute(): void {
    const active = this.tool.wheelActive('scroll', this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents(this.mouse, this.camera, this.intersect)

    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const top = this.camera.top + (1 * wheelEvent.delta) / this.camera.zoom
    this.emitCommand(BlockCommand.MoveCamera, {
      x: this.camera.left,
      y: top,
    })
  }
}

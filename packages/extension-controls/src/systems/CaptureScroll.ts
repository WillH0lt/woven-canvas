import { BaseSystem, CoreCommand, type CoreCommandArgs, comps } from '@infinitecanvas/core'
import { CapturePan } from './CapturePan'
import { CaptureZoom } from './CaptureZoom'

export class CaptureScroll extends BaseSystem<CoreCommandArgs> {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly intersect = this.singleton.read(comps.Intersect)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CapturePan, CaptureZoom))
  }

  public execute(): void {
    const active = this.tool.wheelActive('scroll', this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents(this.mouse, this.camera, this.intersect)

    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const top = this.camera.top + (1 * wheelEvent.delta) / this.camera.zoom
    this.emitCommand(CoreCommand.MoveCamera, {
      x: this.camera.left,
      y: top,
    })
  }
}

import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import * as comps from '@infinitecanvas/core/components'
import { CapturePan } from './CapturePan'

export class CaptureZoom extends BaseSystem<CoreCommandArgs> {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly screen = this.singleton.read(comps.Screen)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly intersect = this.singleton.read(comps.Intersect)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CapturePan))
  }

  public execute(): void {
    const active = this.tool.wheelActive('zoom', this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents(this.mouse, this.camera, this.intersect)
    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const zoom = 2 ** ((-0.8 * wheelEvent.wheelDelta) / 500) * this.camera.zoom

    const cameraWidth = this.screen.width / this.camera.zoom
    const cameraHeight = this.screen.height / this.camera.zoom

    const newCameraWidth = this.screen.width / zoom
    const newCameraHeight = this.screen.height / zoom

    const dx = newCameraWidth - cameraWidth
    const dy = newCameraHeight - cameraHeight

    const percentX = this.mouse.position[0] / this.screen.width
    const percentY = this.mouse.position[1] / this.screen.height

    const x = this.camera.left - percentX * dx
    const y = this.camera.top - percentY * dy

    this.emitCommand(CoreCommand.SetZoom, { zoom })
    this.emitCommand(CoreCommand.MoveCamera, { x, y })
  }
}

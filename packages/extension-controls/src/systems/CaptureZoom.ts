import { BaseSystem, BlockCommand, type BlockCommandArgs, comps } from '@infinitecanvas/core'
import type { ControlCommandArgs } from '../types'
import { CapturePan } from './CapturePan'
import { CaptureSelect } from './CaptureSelect'
import { CaptureTransformBox } from './CaptureTransformBox'

export class CaptureZoom extends BaseSystem<ControlCommandArgs & BlockCommandArgs> {
  private readonly mouse = this.singleton.read(comps.Mouse)

  private readonly screen = this.singleton.read(comps.Screen)

  private readonly camera = this.singleton.read(comps.Camera)

  private readonly tool = this.singleton.read(comps.Tool)

  private readonly keyboard = this.singleton.read(comps.Keyboard)

  private readonly intersect = this.singleton.read(comps.Intersect)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CaptureSelect, CapturePan, CaptureTransformBox))
  }

  public execute(): void {
    const active =
      (this.tool.wheel === 'zoom' && !this.keyboard.modDown) || (this.tool.modWheel === 'zoom' && this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents(this.mouse, this.camera, this.intersect)
    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    const zoom = 2 ** ((-0.8 * wheelEvent.delta) / 500) * this.camera.zoom

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

    this.emitCommand(BlockCommand.SetZoom, zoom)
    this.emitCommand(BlockCommand.MoveCamera, x, y)
  }

  // private getWheelEvents(): WheelEvent
}

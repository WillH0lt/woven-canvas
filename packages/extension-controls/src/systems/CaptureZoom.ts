import { BaseSystem, comps } from '@infinitecanvas/core'
import { ControlCommand, type ControlCommandArgs } from '../types'

export class CaptureZoom extends BaseSystem<ControlCommandArgs> {
  private readonly pointer = this.singleton.read(comps.Pointer)

  private readonly screen = this.singleton.read(comps.Screen)

  private readonly camera = this.singleton.read(comps.Camera)

  public execute(): void {
    if (this.pointer.wheelTrigger) {
      const zoom = 2 ** ((-0.8 * this.pointer.wheelDelta) / 500) * this.camera.zoom

      const cameraWidth = this.screen.width / this.camera.zoom
      const cameraHeight = this.screen.height / this.camera.zoom

      const newCameraWidth = this.screen.width / zoom
      const newCameraHeight = this.screen.height / zoom

      const dx = newCameraWidth - cameraWidth
      const dy = newCameraHeight - cameraHeight

      const percentX = this.pointer.position[0] / this.screen.width
      const percentY = this.pointer.position[1] / this.screen.height

      const x = this.camera.left - percentX * dx
      const y = this.camera.top - percentY * dy

      this.emitCommand(ControlCommand.SetZoom, zoom)
      this.emitCommand(ControlCommand.MoveCamera, x, y)
    }
  }
}

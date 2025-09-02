import { BaseSystem, CoreCommand, type CoreCommandArgs } from '@infinitecanvas/core'
import type { ControlsResources } from '../types'
import { CapturePan } from './CapturePan'

export class CaptureZoom extends BaseSystem<CoreCommandArgs> {
  protected readonly resources!: ControlsResources

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(CapturePan))
  }

  public execute(): void {
    const active = this.controls.wheelActive('zoom', this.keyboard.modDown)
    if (!active) return

    const events = this.getMouseEvents()
    const wheelEvent = events.find((e) => e.type === 'wheel')
    if (!wheelEvent) return

    let zoom = 2 ** ((-0.8 * wheelEvent.wheelDeltaY) / 500) * this.camera.zoom
    zoom = Math.min(this.resources.maxZoom, Math.max(this.resources.minZoom, zoom))

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

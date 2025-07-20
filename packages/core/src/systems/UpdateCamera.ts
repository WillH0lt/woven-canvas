import { BaseSystem, comps } from '@infinitecanvas/core'

import { CoreCommand, type CoreCommandArgs } from '../types'

export class UpdateCamera extends BaseSystem<CoreCommandArgs> {
  private readonly cameras = this.query((q) => q.current.with(comps.Camera).write)

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetZoom, this.setZoom.bind(this))
    this.addCommandListener(CoreCommand.MoveCamera, this.moveCamera.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private setZoom(payload: { zoom: number }): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.zoom = payload.zoom
  }

  private moveCamera(position: { x: number; y: number }): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.left = position.x
    camera.top = position.y
  }
}

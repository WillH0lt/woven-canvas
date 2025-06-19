import { BaseSystem, comps } from '@infinitecanvas/core'

import { ControlCommand, type ControlCommandArgs } from '../types'

export class UpdateCamera extends BaseSystem<ControlCommandArgs> {
  private readonly camera = this.singleton.write(comps.Camera)

  public initialize(): void {
    this.addCommandListener(ControlCommand.SetZoom, this.setZoom.bind(this))
    this.addCommandListener(ControlCommand.MoveCamera, this.moveCamera.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private setZoom(zoom: number): void {
    this.camera.zoom = zoom
    // this.camera.left = x
    // this.camera.top = y
  }

  private moveCamera(x: number, y: number): void {
    this.camera.left = x
    this.camera.top = y

    console.log('Camera moved to:', x, y)
  }
}

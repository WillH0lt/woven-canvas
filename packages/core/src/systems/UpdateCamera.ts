import { BaseSystem, comps } from '@infinitecanvas/core'

import { BlockCommand, type BlockCommandArgs } from '../types'

export class UpdateCamera extends BaseSystem<BlockCommandArgs> {
  private readonly cameras = this.query((q) => q.current.with(comps.Camera).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.SetZoom, this.setZoom.bind(this))
    this.addCommandListener(BlockCommand.MoveCamera, this.moveCamera.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private setZoom(zoom: number): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.zoom = zoom
  }

  private moveCamera(x: number, y: number): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.left = x
    camera.top = y
  }
}

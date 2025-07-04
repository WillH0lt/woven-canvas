import { BaseSystem, comps } from '@infinitecanvas/core'

import { BlockCommand, type BlockCommandArgs, type CommandMeta } from '../types'

export class UpdateCamera extends BaseSystem<BlockCommandArgs> {
  private readonly cameras = this.query((q) => q.current.with(comps.Camera).write)

  public initialize(): void {
    this.addCommandListener(BlockCommand.SetZoom, this.setZoom.bind(this))
    this.addCommandListener(BlockCommand.MoveCamera, this.moveCamera.bind(this))
  }

  public execute(): void {
    this.executeCommands()
  }

  private setZoom(_meta: CommandMeta, payload: { zoom: number }): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.zoom = payload.zoom
  }

  private moveCamera(_meta: CommandMeta, position: { x: number; y: number }): void {
    const camera = this.cameras.current[0].write(comps.Camera)
    camera.left = position.x
    camera.top = position.y
  }
}

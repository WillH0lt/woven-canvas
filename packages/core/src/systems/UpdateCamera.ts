import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import { Camera } from '../components'
import { smoothDamp } from '../helpers'

export class UpdateCamera extends BaseSystem<CoreCommandArgs> {
  private readonly cameras = this.query((q) => q.current.with(Camera).write)

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetZoom, this.setZoom.bind(this))
    this.addCommandListener(CoreCommand.MoveCamera, this.moveCamera.bind(this))
    this.addCommandListener(CoreCommand.SetCameraVelocity, this.setCameraVelocity.bind(this))
  }

  public execute(): void {
    this.executeCommands()

    const hasVelocity = Math.hypot(this.camera.velocity[0], this.camera.velocity[1]) > 0.1

    if (hasVelocity) {
      const camera = this.cameras.current[0].write(Camera)

      const { position, velocity: newVelocity } = smoothDamp(
        [camera.left, camera.top],
        camera.slideTarget,
        camera.velocity,
        camera.slideTime,
        Number.POSITIVE_INFINITY,
        this.delta,
      )

      camera.velocity = newVelocity
      camera.left = position[0]
      camera.top = position[1]
    }
  }

  private setZoom(payload: { zoom: number }): void {
    const camera = this.cameras.current[0].write(Camera)
    camera.zoom = payload.zoom
  }

  private moveCamera(position: { x: number; y: number }): void {
    const camera = this.cameras.current[0].write(Camera)
    camera.left = position.x
    camera.top = position.y

    camera.velocity = [0, 0]
  }

  private setCameraVelocity(velocity: { x: number; y: number }): void {
    const camera = this.cameras.current[0].write(Camera)
    camera.velocity = [velocity.x, velocity.y]

    camera.slideTarget = [
      camera.left + camera.velocity[0] * camera.slideTime,
      camera.top + camera.velocity[1] * camera.slideTime,
    ]
  }
}

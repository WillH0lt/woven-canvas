import { BaseSystem } from '../BaseSystem'
import { Frame } from '../components'

export class PreInputFrameCounter extends BaseSystem {
  private readonly frames = this.query((q) => q.current.with(Frame).write)

  public execute(): void {
    const frame = this.frames.current[0].write(Frame)
    frame.value++
  }
}

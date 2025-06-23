import { System } from '@lastolivegames/becsy'

import { Frame } from '../components'

export class PreInputFrameCounter extends System {
  private readonly frame = this.singleton.write(Frame)

  public execute(): void {
    this.frame.value++
  }
}

import { BaseSystem } from '../BaseSystem'
import { Keyboard } from '../components'
import type { CoreResources } from '../types'

type CommandArgs = {
  [key: string]: []
}

export class CaptureKeyboard extends BaseSystem<CommandArgs> {
  private readonly keyboards = this.query((q) => q.changed.with(Keyboard).trackWrites)

  protected declare readonly resources: CoreResources

  public execute(): void {
    if (!this.keyboards.changed.length) return

    const keyboard = this.keyboards.changed[0].read(Keyboard)

    for (const keybind of this.resources.keybinds) {
      let triggered = keyboard[`${keybind.key}DownTrigger` as keyof Keyboard]

      triggered &&= !!keybind.mod === keyboard.modDown

      triggered &&= !!keybind.shift === keyboard.shiftDown

      if (triggered) {
        this.emitCommand(keybind.command)
        // only 1 keyboard command per frame
        break
      }
    }
  }
}

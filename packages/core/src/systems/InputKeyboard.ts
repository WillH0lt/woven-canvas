import { co } from '@lastolivegames/becsy'

import { BaseSystem } from '../BaseSystem'
import { Keyboard } from '../components'

export class InputKeyboard extends BaseSystem {
  private readonly keyboards = this.query((q) => q.current.with(Keyboard).write)

  private readonly eventsBuffer: KeyboardEvent[] = []

  private updateKeyboard(field: string, value: boolean): void {
    if (!(field in this.keyboard)) return

    const keyboard = this.keyboards.current[0].write(Keyboard)
    Object.assign(keyboard, { [field]: value })
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()

    const keyDown = `${key}Down`

    const keyboard = this.keyboards.current[0].write(Keyboard)
    if (keyboard[keyDown as keyof Keyboard] === false) {
      const triggerKey = `${keyDown}Trigger`
      this.setTrigger(triggerKey)
    }

    this.updateKeyboard(keyDown, true)

    const modDown = e.ctrlKey || e.metaKey
    if (modDown && !this.keyboard.modDown) {
      this.setTrigger('modDownTrigger')
    }
    this.updateKeyboard('modDown', modDown)
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    const keyDown = `${key}Down`

    const triggerKey = `${key}UpTrigger`
    this.setTrigger(triggerKey)

    this.updateKeyboard(keyDown, false)

    const modDown = e.ctrlKey || e.metaKey
    if (!modDown && this.keyboard.modDown) {
      this.setTrigger('modUpTrigger')
    }
    this.updateKeyboard('modDown', modDown)
  }

  @co private *resetKeyboard(): Generator {
    yield

    const keyboard = this.keyboards.current[0].write(Keyboard)
    keyboard.reset()
  }

  @co private *setTrigger(triggerKey: string): Generator {
    this.updateKeyboard(triggerKey, true)

    yield co.waitForFrames(1)

    this.updateKeyboard(triggerKey, false)
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    domElement.addEventListener('keydown', (e) => {
      if (e.key === 'z' && this.keyboard.modDown) {
        e.preventDefault()
      }

      if (e.key === 'Alt') {
        e.preventDefault()
      }

      this.eventsBuffer.push(e)
    })
    domElement.addEventListener('keyup', (e) => {
      if (e.key === 'z' && this.keyboard.modDown) {
        e.preventDefault()
      }

      this.eventsBuffer.push(e)
    })
    domElement.addEventListener('blur', () => this.resetKeyboard())
  }

  public execute(): void {
    for (const e of this.eventsBuffer) {
      if (e.type === 'keydown') {
        this.onKeyDown(e)
      } else if (e.type === 'keyup') {
        this.onKeyUp(e)
      }
    }

    this.eventsBuffer.length = 0
  }
}

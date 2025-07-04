import { BaseSystem, type Resources, comps } from '@infinitecanvas/core'
import { co } from '@lastolivegames/becsy'

export class InputKeyboard extends BaseSystem {
  private readonly keyboards = this.query((q) => q.current.with(comps.Keyboard).write)

  private get keyboard(): comps.Keyboard {
    return this.keyboards.current[0].write(comps.Keyboard)
  }

  // declaring to becsy that keyboard is a singleton component
  private readonly _keyboard = this.singleton.read(comps.Keyboard)

  protected declare readonly resources: Resources

  private keyUpFrames: { key: string; frame: number }[] = []

  private keyDownFrames: { key: string; frame: number }[] = []

  private updateKeyboard(field: string, value: boolean): void {
    if (!(field in this.keyboard)) return
    Object.assign(this.keyboard, { [field]: value })
  }

  @co private *onKeyDown(e: KeyboardEvent): Generator {
    const key = e.key.toLowerCase()

    this.keyDownFrames.push({ key, frame: this.frame.value })

    if (this.keyUpFrames.some((kf) => kf.key === key && kf.frame === this.frame.value)) {
      console.warn(
        `tried to handle keydown, but keyup has been called this frame for key: ${key} on frame: ${this.frame.value}`,
      )
      return
    }

    const keyDown = `${key}Down`

    if (this.keyboard[keyDown as keyof comps.Keyboard] === false) {
      const triggerKey = `${keyDown}Trigger`
      this.setTrigger(triggerKey)
    }

    this.updateKeyboard(keyDown, true)

    const modDown = e.ctrlKey || e.metaKey
    if (modDown && !this.keyboard.modDown) {
      this.setTrigger('modDownTrigger')
    }
    this.updateKeyboard('modDown', modDown)

    if (e.key === 'z' && this.keyboard.modDown) {
      e.preventDefault()
    }

    yield
  }

  @co private *onKeyUp(e: KeyboardEvent): Generator {
    const key = e.key.toLowerCase()
    const keyDown = `${key}Down`

    this.keyUpFrames.push({ key, frame: this.frame.value })

    if (this.keyDownFrames.some((kf) => kf.key === key && kf.frame === this.frame.value)) {
      console.warn(
        `tried to handle keyup, but keydown has been called this frame on frame: ${key} at time: ${this.frame.value}`,
      )
      return
    }

    const triggerKey = `${key}UpTrigger`
    this.setTrigger(triggerKey)

    this.updateKeyboard(keyDown, false)

    const modDown = e.ctrlKey || e.metaKey
    if (!modDown && this.keyboard.modDown) {
      this.setTrigger('modUpTrigger')
    }
    this.updateKeyboard('modDown', modDown)

    if (e.key === 'z' && this.keyboard.modDown) {
      e.preventDefault()
    }

    yield
  }

  @co private *setTrigger(triggerKey: string): Generator {
    this.updateKeyboard(triggerKey, true)

    yield co.waitForFrames(1)

    this.updateKeyboard(triggerKey, false)
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    domElement.addEventListener('keydown', this.onKeyDown.bind(this))
    domElement.addEventListener('keyup', this.onKeyUp.bind(this))
  }
}

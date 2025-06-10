import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export class InputKeyboard extends System {
  private readonly keyboard = this.singleton.write(comps.Keyboard)

  private readonly resources!: Resources

  private keyUpFrames: { key: string; frame: number }[] = []

  private keyDownFrames: { key: string; frame: number }[] = []

  private frame = 0

  private updateKeyboard(field: string, value: boolean): void {
    if (!(field in this.keyboard)) return
    Object.assign(this.keyboard, { [field]: value })
  }

  @co private *onKeyDown(e: KeyboardEvent): Generator {
    const key = e.key.toLowerCase()

    this.keyDownFrames.push({ key, frame: this.frame })

    if (this.keyUpFrames.some((kf) => kf.key === key && kf.frame === this.frame)) {
      console.warn(
        `tried to handle keydown, but keyup has been called this frame for key: ${key} on frame: ${this.frame}`,
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

    this.keyUpFrames.push({ key, frame: this.frame })

    if (this.keyDownFrames.some((kf) => kf.key === key && kf.frame === this.frame)) {
      console.warn(
        `tried to handle keyup, but keydown has been called this frame on frame: ${key} at time: ${this.frame}`,
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

  public execute(): void {
    this.frame++
  }
}

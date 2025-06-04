import { type Resources, comps } from '@infinitecanvas/core'
import { System, co } from '@lastolivegames/becsy'

export class InputKeyboard extends System {
  private readonly keyboard = this.singleton.write(comps.Keyboard)

  private readonly resources!: Resources

  @co private *onKeyDown(e: KeyboardEvent): Generator {
    const key = `${e.key === ' ' ? 'space' : e.key.toLowerCase()}Down`
    if (key in this.keyboard) {
      if (this.keyboard[key as keyof comps.Keyboard] === false) {
        const triggerKey = `${key}Trigger`
        this.setTrigger(triggerKey)
      }

      Object.assign(this.keyboard, { [key]: true })
    }

    const modDown = e.ctrlKey || e.metaKey
    if (modDown && !this.keyboard.modDown) {
      this.setTrigger('modDownTrigger')
    }
    this.keyboard.modDown = modDown

    if (e.key === 'z' && this.keyboard.modDown) {
      e.preventDefault()
    }

    yield
  }

  @co private *onKeyUp(e: KeyboardEvent): Generator {
    const key = e.key === ' ' ? 'space' : e.key.toLowerCase()
    const keyDown = `${key}Down`
    if (keyDown in this.keyboard) {
      if (this.keyboard[key as keyof comps.Keyboard] === true) {
        const triggerKey = `${key}UpTrigger`
        this.setTrigger(triggerKey)
      }

      Object.assign(this.keyboard, { [keyDown]: false })
    }

    const modDown = e.ctrlKey || e.metaKey
    if (!modDown && this.keyboard.modDown) {
      this.setTrigger('modUpTrigger')
    }
    this.keyboard.modDown = modDown

    if (e.key === 'z' && this.keyboard.modDown) {
      e.preventDefault()
    }

    yield
  }

  @co private *setTrigger(triggerKey: string): Generator {
    if (!(triggerKey in this.keyboard)) {
      throw new Error(`Invalid trigger key: ${triggerKey}`)
    }

    Object.assign(this.keyboard, { [triggerKey]: true })

    yield co.waitForFrames(1)

    Object.assign(this.keyboard, { [triggerKey]: false })
  }

  public initialize(): void {
    const domElement = this.resources.domElement

    domElement.addEventListener('keydown', this.onKeyDown.bind(this))
    domElement.addEventListener('keyup', this.onKeyUp.bind(this))
  }
}

import { comps } from '@infinitecanvas/core'
import { System, World } from '@lastolivegames/becsy'
import { afterEach, beforeEach } from 'vitest'

import { InputKeyboard } from '../../src/systems/InputKeyboard'

const keysDown = new Set<string>()
const triggers = new Set<string>()

class Reader extends System {
  private readonly keyboard = this.singleton.read(comps.Keyboard)

  public constructor() {
    super()
    this.schedule((s) => s.after(InputKeyboard))
  }

  execute() {
    for (const key of Object.keys(this.keyboard)) {
      if (key.endsWith('Trigger')) {
        if (this.keyboard[key as keyof comps.Keyboard] === true) {
          triggers.add(key)
        } else {
          triggers.delete(key)
        }
      } else {
        if (this.keyboard[key as keyof comps.Keyboard] === true) {
          keysDown.add(key)
        } else {
          keysDown.delete(key)
        }
      }
    }
  }
}

let world: World
let domElement: HTMLDivElement

beforeEach(async () => {
  domElement = document.createElement('div')
  const resources = {
    domElement,
  }

  world = await World.create({
    defs: [System.group(InputKeyboard, { resources }, Reader)],
  })
})

afterEach(async () => {
  if (world) {
    await world.terminate()
  }
  keysDown.clear()
  triggers.clear()
})

function dispatchEvent(eventType: string, key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}) {
  const event = new KeyboardEvent(eventType, {
    key,
    ...modifiers,
  })
  domElement.dispatchEvent(event)
}

describe('input keyboard', async () => {
  it('should update keyboard state on keydown/keyup', async () => {
    // keydown
    dispatchEvent('keydown', 'escape')
    await world.execute()
    expect(keysDown.has('escapeDown')).toBe(true)

    // keyup
    dispatchEvent('keyup', 'escape')
    await world.execute()
    expect(keysDown.has('escapeDown')).toBe(false)
  })

  it('should handle modifier keys', async () => {
    const modKeys = ['ctrlKey', 'metaKey']
    for (const modKey of modKeys) {
      // Simulate mod + z keydown
      dispatchEvent('keydown', 'z', { [modKey]: true })
      await world.execute()
      expect(keysDown.has('modDown')).toBe(true)

      // release z key
      dispatchEvent('keyup', 'z', { [modKey]: true })
      await world.execute()
      expect(keysDown.has('modDown')).toBe(true)

      // press z again without mod
      dispatchEvent('keydown', 'z', { [modKey]: false })
      await world.execute()
      expect(keysDown.has('modDown')).toBe(false)
    }
  })

  it('should set trigger for 1 frame on keydown/keyup', async () => {
    dispatchEvent('keydown', 'escape')
    await world.execute()
    expect(triggers.has('escapeDownTrigger')).toBe(true)

    await world.execute()
    expect(keysDown.has('escapeDownTrigger')).toBe(false)

    dispatchEvent('keyup', 'escape')
    await world.execute()
    expect(triggers.has('escapeUpTrigger')).toBe(true)
    await world.execute()
    expect(keysDown.has('escapeUpTrigger')).toBe(false)
  })

  it('should handle multiple keys', async () => {
    dispatchEvent('keydown', 'x')
    dispatchEvent('keydown', 'y')
    await world.execute()
    expect(keysDown.has('xDown')).toBe(true)
    expect(keysDown.has('yDown')).toBe(true)

    dispatchEvent('keyup', 'x')
    await world.execute()
    expect(keysDown.has('xDown')).toBe(false)
    expect(keysDown.has('yDown')).toBe(true)

    dispatchEvent('keyup', 'y')
    await world.execute()
    expect(keysDown.has('yDown')).toBe(false)
  })

  it('should handle key up then down in a single frame', async () => {
    dispatchEvent('keydown', 'escape')
    dispatchEvent('keyup', 'escape')
    await world.execute()
    expect(keysDown.has('escapeDown')).toBe(false)
    expect(triggers.has('escapeDownTrigger')).toBe(false)
    expect(triggers.has('escapeUpTrigger')).toBe(true)
  })

  it('should handle key down then up in a single frame', async () => {
    dispatchEvent('keyup', 'escape')
    dispatchEvent('keydown', 'escape')
    await world.execute()
    expect(keysDown.has('escapeDown')).toBe(true)
    expect(triggers.has('escapeDownTrigger')).toBe(true)
    expect(triggers.has('escapeUpTrigger')).toBe(false)
  })
})

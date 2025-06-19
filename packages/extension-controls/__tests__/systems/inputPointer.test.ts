import { comps } from '@infinitecanvas/core'
import { System, World } from '@lastolivegames/becsy'
import { afterEach, beforeEach } from 'vitest'
import { CLICK_THRESHOLD, InputPointer } from '../../src/systems/InputPointer'

let moveTrigger: boolean
let downTrigger: boolean
let upTrigger: boolean
let pointerPosition: [number, number]
let pointerDownPosition: [number, number]
let pointerUpPosition: [number, number]
let pointerIsDown: boolean
let clickTrigger: boolean
let world: World
let domElement: HTMLDivElement

class PointerReader extends System {
  private readonly pointer = this.singleton.read(comps.Pointer)

  public constructor() {
    super()
    this.schedule((s) => s.after(InputPointer))
  }

  execute() {
    moveTrigger = this.pointer.moveTrigger
    downTrigger = this.pointer.downTrigger
    upTrigger = this.pointer.upTrigger
    pointerPosition = [this.pointer.position[0], this.pointer.position[1]]
    pointerDownPosition = [this.pointer.downPosition[0], this.pointer.downPosition[1]]
    pointerUpPosition = [this.pointer.upPosition[0], this.pointer.upPosition[1]]
    pointerIsDown = this.pointer.isDown
    clickTrigger = this.pointer.clickTrigger
  }
}

beforeEach(async () => {
  domElement = document.createElement('div')
  const resources = { domElement }
  world = await World.create({
    defs: [System.group(InputPointer, { resources }, PointerReader)],
  })
})

afterEach(async () => {
  if (world) await world.terminate()
})

describe('InputPointer', () => {
  it('should update position and set moveTrigger on pointermove', async () => {
    const x = 123
    const y = 456

    const event = new PointerEvent('pointermove', { clientX: x, clientY: y })
    window.dispatchEvent(event)

    await world.execute()

    expect(pointerPosition).toEqual([x, y])
    expect(moveTrigger).toBe(true)

    await world.execute()
    expect(moveTrigger).toBe(false)
  })

  it('should set isDown, position, downPosition, and downTrigger on pointerdown', async () => {
    const event = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, button: 0 })
    domElement.dispatchEvent(event)
    await world.execute()

    expect(pointerIsDown).toBe(true)
    expect(pointerPosition).toEqual([10, 20])
    expect(pointerDownPosition).toEqual([10, 20])
    expect(downTrigger).toBe(true)

    await world.execute()
    expect(downTrigger).toBe(false)
  })

  it('should set isDown false, update position, and set upTrigger on pointerup', async () => {
    // First, pointerdown to set isDown true
    domElement.dispatchEvent(new PointerEvent('pointerdown', { clientX: 1, clientY: 2, button: 0 }))
    await world.execute()

    // Now pointerup
    const event = new PointerEvent('pointerup', { clientX: 5, clientY: 6, button: 0 })
    window.dispatchEvent(event)
    await world.execute()

    expect(pointerIsDown).toBe(false)
    expect(pointerPosition).toEqual([5, 6])
    expect(pointerUpPosition).toEqual([5, 6])
    expect(upTrigger).toBe(true)

    await world.execute()
    expect(upTrigger).toBe(false)
  })

  it('should not trigger downTrigger for non-left mouse button', async () => {
    const event = new PointerEvent('pointerdown', { clientX: 10, clientY: 20, button: 2 })
    domElement.dispatchEvent(event)
    await world.execute()
    expect(pointerIsDown).toBe(false)
    expect(downTrigger).toBe(false)
  })

  it("should keep move trigger true on each frame there's a pointermove", async () => {
    let x = 0
    let y = 0
    for (let i = 0; i < 5; i++) {
      x += 10
      y += 10
      const event = new PointerEvent('pointermove', { clientX: x, clientY: y })
      window.dispatchEvent(event)
      await world.execute()
      expect(moveTrigger).toBe(true)
      expect(pointerPosition).toEqual([x, y])
    }

    await world.execute()
    expect(moveTrigger).toBe(false)
  })

  it('should handle pointer down then up in a single frame', async () => {
    const downEvent = new PointerEvent('pointerdown', { clientX: 30, clientY: 40, button: 0 })
    domElement.dispatchEvent(downEvent)

    const upEvent = new PointerEvent('pointerup', { clientX: 10, clientY: 20, button: 0 })
    window.dispatchEvent(upEvent)

    await world.execute()

    expect(pointerIsDown).toBe(false)
    expect(pointerPosition).toEqual([10, 20])
    expect(upTrigger).toBe(true)
    expect(downTrigger).toBe(false)

    await world.execute()
    expect(upTrigger).toBe(false)
  })

  it('should handle pointer up then down in a single frame', async () => {
    const upEvent = new PointerEvent('pointerup', { clientX: 10, clientY: 20, button: 0 })
    window.dispatchEvent(upEvent)

    const downEvent = new PointerEvent('pointerdown', { clientX: 30, clientY: 40, button: 0 })
    domElement.dispatchEvent(downEvent)

    await world.execute()

    expect(pointerIsDown).toBe(true)
    expect(pointerPosition).toEqual([30, 40])
    expect(downTrigger).toBe(true)
    expect(upTrigger).toBe(false)

    await world.execute()
    expect(downTrigger).toBe(false)
  })

  it('should trigger clickTrigger if pointer down and up are within CLICK_THRESHOLD', async () => {
    const downEvent = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 })
    domElement.dispatchEvent(downEvent)

    await world.execute()

    const upEvent = new PointerEvent('pointerup', { clientX: 0, clientY: CLICK_THRESHOLD, button: 0 })
    window.dispatchEvent(upEvent)

    await world.execute()

    expect(clickTrigger).toBe(true)

    await world.execute()

    expect(clickTrigger).toBe(false)
  })

  it('should not trigger clickTrigger if pointer down and up are outside CLICK_THRESHOLD', async () => {
    const downEvent = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 })
    domElement.dispatchEvent(downEvent)

    await world.execute()

    const upEvent = new PointerEvent('pointerup', { clientX: 0, clientY: CLICK_THRESHOLD + 1, button: 0 })
    window.dispatchEvent(upEvent)

    await world.execute()

    expect(clickTrigger).toBe(false)
  })

  it('should set upTrigger on pointer cancel event', async () => {
    const event = new KeyboardEvent('pointercancel')
    window.dispatchEvent(event)
    await world.execute()

    expect(upTrigger).toBe(true)

    await world.execute()

    expect(upTrigger).toBe(false)
  })
})

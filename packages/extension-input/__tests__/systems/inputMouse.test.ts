import { comps } from '@infinitecanvas/core'
import { System, World } from '@lastolivegames/becsy'
import { afterEach, beforeEach } from 'vitest'
import { InputMouse } from '../../src/systems'

let moveTrigger: boolean
let position: [number, number]
let wheelDelta: number
let wheelTrigger: boolean
let world: World
let domElement: HTMLDivElement

class MouseReader extends System {
  private readonly mouse = this.singleton.read(comps.Mouse)

  public constructor() {
    super()
    this.schedule((s) => s.after(InputMouse))
  }

  execute() {
    moveTrigger = this.mouse.moveTrigger
    position = [this.mouse.position[0], this.mouse.position[1]]
    wheelDelta = this.mouse.wheelDelta
    wheelTrigger = this.mouse.wheelTrigger
  }
}

beforeEach(async () => {
  domElement = document.createElement('div')
  const resources = { domElement }
  world = await World.create({
    defs: [System.group(InputMouse, { resources }, MouseReader)],
  })
})

afterEach(async () => {
  if (world) await world.terminate()
})

describe('InputMouse', () => {
  it('should update position and set moveTrigger on mousemove', async () => {
    const x = 123
    const y = 456

    const event = new MouseEvent('mousemove', { clientX: x, clientY: y })
    window.dispatchEvent(event)

    await world.execute()

    expect(position).toEqual([x, y])
    expect(moveTrigger).toBe(true)

    await world.execute()
    expect(moveTrigger).toBe(false)
  })

  it("should keep move trigger true on each frame there's a mousemove", async () => {
    let x = 0
    let y = 0
    for (let i = 0; i < 5; i++) {
      x += 10
      y += 10
      const event = new MouseEvent('mousemove', { clientX: x, clientY: y })
      window.dispatchEvent(event)
      await world.execute()
      expect(moveTrigger).toBe(true)
      expect(position).toEqual([x, y])
    }

    await world.execute()
    expect(moveTrigger).toBe(false)
  })

  it('should set wheelDelta and wheelTrigger on wheel event', async () => {
    const deltaY = -100
    const event = new WheelEvent('wheel', { deltaY })
    domElement.dispatchEvent(event)
    await world.execute()

    expect(wheelDelta).toBe(deltaY)
    expect(wheelTrigger).toBe(true)

    await world.execute()
    expect(wheelTrigger).toBe(false)
  })

  it("should set wheelTrigger true on each frame there's a wheel event", async () => {
    for (let i = 0; i < 3; i++) {
      const event = new WheelEvent('wheel')
      domElement.dispatchEvent(event)
      await world.execute()
      expect(wheelTrigger).toBe(true)
    }

    await world.execute()
    expect(wheelTrigger).toBe(false)
  })
})

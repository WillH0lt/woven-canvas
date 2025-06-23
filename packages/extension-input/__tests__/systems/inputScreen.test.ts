import { comps } from '@infinitecanvas/core'
import { System, World } from '@lastolivegames/becsy'
import { afterEach, beforeEach, vi } from 'vitest'
import { InputScreen } from '../../src/systems/InputScreen'

const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

let world: World
let domElement: HTMLDivElement

let width = 0
let height = 0

class Reader extends System {
  private readonly screen = this.singleton.read(comps.Screen)

  public constructor() {
    super()
    this.schedule((s) => s.after(InputScreen))
  }

  execute() {
    width = this.screen.width
    height = this.screen.height
  }
}

beforeEach(async () => {
  window.ResizeObserver = mockResizeObserver

  domElement = document.createElement('div')
  domElement.style.position = 'absolute'

  document.body.appendChild(domElement)

  const resources = { domElement }
  world = await World.create({
    defs: [System.group(InputScreen, { resources }, Reader)],
  })
})

afterEach(async () => {
  vi.restoreAllMocks()

  if (world) {
    await world.terminate()
    width = 0
    height = 0
  }
})

describe('InputScreen', () => {
  it('should update width and height on resize', async () => {
    const w = 123
    const h = 456

    domElement.style.width = `${w}px`
    domElement.style.height = `${h}px`

    // @ts-ignore
    const resizeCallback = mockResizeObserver.mock.calls[0][0]

    // @ts-ignore
    resizeCallback([
      {
        target: domElement,
      },
    ])

    await world.execute()
    expect(width).toBe(w)
    expect(height).toBe(h)
  })
})

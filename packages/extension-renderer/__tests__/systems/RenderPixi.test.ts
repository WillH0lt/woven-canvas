import { type Block, comps } from '@infinitecanvas/core'
import { System, World, co } from '@lastolivegames/becsy'
import { Application } from 'pixi.js'
import { Emitter } from 'strict-event-emitter'
import { afterEach, beforeEach, vi } from 'vitest'

import { RenderPixi } from '../../src/systems/RenderPixi'

type EmitterEvents = {
  add: [Partial<Block>]
  change: [Partial<Block>]
  remove: [string]
  resize: []
}

const emitter = new Emitter<EmitterEvents>()

class EmitterListener extends System {
  private readonly blocks = this.query((q) => q.current.with(comps.Block).write)

  private readonly screen = this.singleton.write(comps.Screen)

  public constructor() {
    super()
    this.schedule((s) => s.before(RenderPixi))
  }

  @co private *addBlock(block: Partial<Block>): Generator {
    this.createEntity(comps.Block, block)
    yield
  }

  @co private *changeBlock(block: Partial<Block>): Generator {
    const entity = this.blocks.current.find((e) => e.read(comps.Block).id === block.id)
    if (entity) {
      const writableBlock = entity.write(comps.Block)
      Object.assign(writableBlock, block)
    }
    yield
  }

  @co private *removeBlock(id: string): Generator {
    const entity = this.blocks.current.find((e) => e.read(comps.Block).id === id)
    if (entity) {
      entity.delete()
    }
    yield
  }

  @co private *resize(): Generator {
    this.screen.resizedTrigger = true
    yield
  }

  public initialize(): void {
    emitter.on('add', this.addBlock.bind(this))
    emitter.on('change', this.changeBlock.bind(this))
    emitter.on('remove', this.removeBlock.bind(this))
    emitter.on('resize', this.resize.bind(this))
  }
}

let pixiApp: Application
let world: World

beforeEach(async () => {
  pixiApp = new Application()

  await pixiApp.init({
    autoStart: false,
  })

  const domElement = document.createElement('div')
  const resources = {
    domElement,
    pixiApp,
  }

  world = await World.create({
    defs: [System.group(RenderPixi, { resources }, EmitterListener)],
  })
})

afterEach(async () => {
  pixiApp?.destroy(true)
  await world?.terminate()
})

describe('RenderPixi', () => {
  it('adds new blocks to pixi app', async () => {
    const id = 'block1'
    emitter.emit('add', { id })

    await world.execute()

    const graphic = pixiApp.stage.children.find((child) => child.label === id)

    expect(graphic).toBeTruthy()
  })

  it('updates existing blocks in pixi app', async () => {
    const id = 'block1'
    emitter.emit('add', { id, width: 30, height: 40 })

    await world.execute()

    let graphic = pixiApp.stage.children.find((child) => child.label === id)
    expect(graphic).toBeTruthy()
    expect(graphic?.width).toBe(30)
    expect(graphic?.height).toBe(40)

    emitter.emit('change', { id, width: 70, height: 80 })

    await world.execute()

    graphic = pixiApp.stage.children.find((child) => child.label === id)
    expect(graphic?.width).toBe(70)
    expect(graphic?.height).toBe(80)
  })

  it('removes blocks from pixi app', async () => {
    const id = 'block1'
    emitter.emit('add', { id })

    await world.execute()

    let graphic = pixiApp.stage.children.find((child) => child.label === id)
    expect(graphic).toBeTruthy()

    emitter.emit('remove', id)

    await world.execute()

    graphic = pixiApp.stage.children.find((child) => child.label === id)
    expect(graphic).toBeFalsy()
  })

  it('calls pixiApp.render() on execute', async () => {
    const renderSpy = vi.spyOn(pixiApp, 'render')
    await world.execute()
    expect(renderSpy).toHaveBeenCalledOnce()

    await world.execute()
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })

  it('resizes pixi app on screen resize', async () => {
    const resizeSpy = vi.spyOn(pixiApp.renderer, 'resize')
    emitter.emit('resize')
    await world.execute()
    expect(resizeSpy).toHaveBeenCalledOnce()
  })
})

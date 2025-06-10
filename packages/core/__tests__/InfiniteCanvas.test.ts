import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Extension } from '../src/Extension'
import { InfiniteCanvas } from '../src/InfiniteCanvas'
import type { Block, Options } from '../src/types'

// Mock Extension implementation for testing
class MockExtension extends Extension {
  async initialize() {
    /* no-op */
  }
}

describe('InfiniteCanvas', () => {
  let options: Options
  let _blocks: Block[]
  let extensions: Extension[]

  beforeEach(() => {
    options = { autoloop: false }
    _blocks = [
      {
        id: 'block1',
      },
    ] as Block[]
    extensions = [new MockExtension()]
  })

  it('should create an InfiniteCanvas instance', async () => {
    const canvas = await InfiniteCanvas.New(extensions, options)
    expect(canvas).toBeInstanceOf(InfiniteCanvas)
    expect(canvas.domElement).toBeInstanceOf(HTMLElement)
    expect(canvas.options).toEqual(options)
  })

  it('should have a working execute method', async () => {
    const canvas = await InfiniteCanvas.New(extensions, options)
    // @ts-ignore: accessing private for test
    const spy = vi.spyOn(canvas.world, 'execute').mockResolvedValueOnce()
    await canvas.execute()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should start loop if autoloop is true', async () => {
    options.autoloop = true
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      // Don't actually recurse
      return 1
    })
    const canvas = await InfiniteCanvas.New(extensions, options)
    expect(canvas.options.autoloop).toBe(true)
    expect(raf).toHaveBeenCalled()
    raf.mockRestore()
  })
})

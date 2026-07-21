import { Block, Editor, filterRoots } from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../testUtils'

describe('filterRoots', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = document.createElement('div')
    document.body.appendChild(domElement)

    editor = new Editor(domElement, { grid: { enabled: false } })
    await editor.initialize()
  })

  afterEach(async () => {
    if (editor) {
      await editor.dispose()
    }
    if (domElement?.parentNode) {
      domElement.parentNode.removeChild(domElement)
    }
  })

  it('returns all entities when none are related', async () => {
    let result: number[] | undefined
    let a: number | undefined
    let b: number | undefined

    editor.nextTick((ctx) => {
      a = createBlock(ctx)
      b = createBlock(ctx)
      result = filterRoots(ctx, [a, b])
    })

    await editor.tick()
    expect(result).toEqual([a, b])
  })

  it('excludes a child whose parent is in the set', async () => {
    let result: number[] | undefined
    let parent: number | undefined

    editor.nextTick((ctx) => {
      parent = createBlock(ctx)
      const child = createBlock(ctx)
      Block.write(ctx, child).parentId = parent
      result = filterRoots(ctx, [parent, child])
    })

    await editor.tick()
    expect(result).toEqual([parent])
  })

  it('keeps a child whose parent is not in the set', async () => {
    let result: number[] | undefined
    let child: number | undefined

    editor.nextTick((ctx) => {
      const parent = createBlock(ctx)
      child = createBlock(ctx)
      Block.write(ctx, child).parentId = parent
      result = filterRoots(ctx, [child])
    })

    await editor.tick()
    expect(result).toEqual([child])
  })

  it('excludes a grandchild when only its grandparent is in the set', async () => {
    let result: number[] | undefined
    let grandparent: number | undefined

    editor.nextTick((ctx) => {
      grandparent = createBlock(ctx)
      const parent = createBlock(ctx)
      const grandchild = createBlock(ctx)
      Block.write(ctx, parent).parentId = grandparent
      Block.write(ctx, grandchild).parentId = parent
      // The intermediate parent is not part of the set
      result = filterRoots(ctx, [grandparent, grandchild])
    })

    await editor.tick()
    expect(result).toEqual([grandparent])
  })
})

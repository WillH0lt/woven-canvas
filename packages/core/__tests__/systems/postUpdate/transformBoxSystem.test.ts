import {
  Block,
  type Context,
  defineQuery,
  Edited,
  Editor,
  type EditorPlugin,
  hasComponent,
  Opacity,
  ResizeMode,
} from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  EndTransformBoxEdit,
  HideTransformBox,
  RemoveTransformBox,
  ShowTransformBox,
  StartTransformBoxEdit,
  UpdateTransformBox,
} from '../../../src/commands'
import { DragStart, TransformBox, TransformHandle } from '../../../src/components'
import { TransformBoxStateSingleton } from '../../../src/singletons'
import { TransformHandleKind } from '../../../src/types'
import { createBlock } from '../../testUtils'

// Define queries at module level
const transformBoxQuery = defineQuery((q) => q.with(Block, TransformBox))
const transformHandleQuery = defineQuery((q) => q.with(Block, TransformHandle))

// Test plugin that adds extra blockDefs not in CorePlugin (for testing handle creation logic)
const testBlockDefsPlugin: EditorPlugin = {
  name: 'test-block-defs',
  blockDefs: [
    {
      tag: 'noRotate',
      canRotate: false,
      canScale: true,
    },
    {
      tag: 'noScale',
      canRotate: true,
      canScale: false,
    },
    {
      tag: 'groupOnly',
      resizeMode: ResizeMode.GroupOnly,
    },
  ],
}

describe('PostUpdateTransformBox', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = document.createElement('div')
    document.body.appendChild(domElement)

    editor = new Editor(domElement, { plugins: [testBlockDefsPlugin] })
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

  describe('AddTransformBox command', () => {
    it('should create a transform box when a block is selected', async () => {
      let transformBoxCount = 0

      // Create and select a block - pipeline creates transform box automatically
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Check that transform box was created
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        transformBoxCount = transformBoxes.length
      })

      await editor.tick()
      expect(transformBoxCount).toBe(1)
    })

    it('should create transform handles for selected block', async () => {
      let handleCount = 0

      // Create and select a block
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'image' })
      })

      await editor.tick()

      // Check handle count
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        handleCount = handles.length
      })

      await editor.tick()
      // Should have corner scale handles (4) + rotation handles (4) + edge handles (4)
      expect(handleCount).toBeGreaterThan(0)
    })

    it('should size transform box to match selected block bounds', async () => {
      let boxPosition: [number, number] = [0, 0]
      let boxSize: [number, number] = [0, 0]

      // Create and select a block with specific position/size
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [50, 75],
          size: [200, 150],
          selected: true,
        })
      })

      await editor.tick()

      // Check transform box bounds
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        if (transformBoxes.length > 0) {
          const block = Block.read(ctx, transformBoxes[0])
          boxPosition = [...block.position] as [number, number]
          boxSize = [...block.size] as [number, number]
        }
      })

      await editor.tick()
      expect(boxPosition).toEqual([50, 75])
      expect(boxSize).toEqual([200, 150])
    })

    it('should encompass multiple selected blocks', async () => {
      let boxPosition: [number, number] = [0, 0]
      let boxSize: [number, number] = [0, 0]

      // Create and select two blocks
      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          selected: true,
        })
        createBlock(ctx, {
          position: [200, 150],
          size: [100, 100],
          selected: true,
        })
      })

      await editor.tick()

      // Check transform box encompasses both blocks
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        if (transformBoxes.length > 0) {
          const block = Block.read(ctx, transformBoxes[0])
          boxPosition = [...block.position] as [number, number]
          boxSize = [...block.size] as [number, number]
        }
      })

      await editor.tick()
      // Should span from (0,0) to (300,250)
      expect(boxPosition).toEqual([0, 0])
      expect(boxSize).toEqual([300, 250])
    })
  })

  describe('RemoveTransformBox command', () => {
    it('should remove transform box and handles', async () => {
      let transformBoxCount = 0
      let handleCount = 0

      // Create block, select it - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Remove the pipeline-created transform box
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          RemoveTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check counts
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        const handles = transformHandleQuery.current(ctx)
        transformBoxCount = transformBoxes.length
        handleCount = handles.length
      })

      await editor.tick()
      expect(transformBoxCount).toBe(0)
      expect(handleCount).toBe(0)
    })
  })

  describe('HideTransformBox command', () => {
    it('should add Opacity component with value 0 to transform box', async () => {
      let hasOpacity = false
      let opacityValue = 1

      // Create and select block - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Hide the pipeline-created transform box
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          HideTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check opacity
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        if (transformBoxes.length > 0) {
          hasOpacity = hasComponent(ctx, transformBoxes[0], Opacity)
          if (hasOpacity) {
            opacityValue = Opacity.read(ctx, transformBoxes[0]).value
          }
        }
      })

      await editor.tick()
      expect(hasOpacity).toBe(true)
      expect(opacityValue).toBe(0)
    })

    it('should hide all handles', async () => {
      let allHandlesHidden = false

      // Create and select block - pipeline creates transform box with handles
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'image' })
      })

      await editor.tick()

      // Hide the pipeline-created transform box
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          HideTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check all handles have opacity 0
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        allHandlesHidden =
          handles.length > 0 &&
          handles.every((id) => {
            if (!hasComponent(ctx, id, Opacity)) return false
            return Opacity.read(ctx, id).value === 0
          })
      })

      await editor.tick()
      expect(allHandlesHidden).toBe(true)
    })
  })

  describe('ShowTransformBox command', () => {
    it('should remove Opacity component from transform box', async () => {
      let hasOpacity = true

      // Create and select block - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Hide then show
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          HideTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          ShowTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check opacity removed
      editor.nextTick((ctx) => {
        const transformBoxes = transformBoxQuery.current(ctx)
        if (transformBoxes.length > 0) {
          hasOpacity = hasComponent(ctx, transformBoxes[0], Opacity)
        }
      })

      await editor.tick()
      expect(hasOpacity).toBe(false)
    })
  })

  describe('StartTransformBoxEdit command', () => {
    it('should add Edited component to selected blocks', async () => {
      let blockId: number | undefined
      let hasEdited = false

      // Create and select block - pipeline creates transform box
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Start edit using the pipeline-created transform box
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          StartTransformBoxEdit.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check edited
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasEdited = hasComponent(ctx, blockId, Edited)
        }
      })

      await editor.tick()
      expect(hasEdited).toBe(true)
    })

    it('should remove handles during edit', async () => {
      let handleCount = 0

      // Create and select block - pipeline creates transform box with handles
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'image' })
      })

      await editor.tick()

      // Start edit
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          StartTransformBoxEdit.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // Check handles removed
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        handleCount = handles.length
      })

      await editor.tick()
      expect(handleCount).toBe(0)
    })
  })

  describe('EndTransformBoxEdit command', () => {
    it('should remove Edited component from blocks', async () => {
      let blockId: number | undefined
      let hasEdited = true

      // Create and select block - pipeline creates transform box
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Start edit
      editor.nextTick((ctx) => {
        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          StartTransformBoxEdit.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      // End edit
      editor.nextTick((ctx) => {
        EndTransformBoxEdit.spawn(ctx, undefined)
      })

      await editor.tick()

      // Check edited removed
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasEdited = hasComponent(ctx, blockId, Edited)
        }
      })

      await editor.tick()
      expect(hasEdited).toBe(false)
    })
  })

  describe('handle creation based on blockDefs', () => {
    it('should not create rotation handles when canRotate is false', async () => {
      let rotationHandleCount = 0

      // Create block with canRotate: false - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'noRotate' })
      })

      await editor.tick()

      // Count rotation handles
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        rotationHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id)
          return handle.kind === TransformHandleKind.Rotate
        }).length
      })

      await editor.tick()
      expect(rotationHandleCount).toBe(0)
    })

    it('should not create scale handles when canScale is false', async () => {
      let scaleHandleCount = 0

      // Create block with canScale: false - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'noScale' })
      })

      await editor.tick()

      // Count scale handles
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        scaleHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id)
          return handle.kind === TransformHandleKind.Scale
        }).length
      })

      await editor.tick()
      expect(scaleHandleCount).toBe(0)
    })

    it('should create stretch handles for left/right edges when resizeMode is text', async () => {
      let stretchHandleCount = 0

      // Create block with resizeMode: text - pipeline creates transform box
      editor.nextTick((ctx) => {
        createBlock(ctx, { selected: true, tag: 'text' })
      })

      await editor.tick()

      // Count stretch handles (should be left/right edges)
      editor.nextTick((ctx) => {
        const handles = transformHandleQuery.current(ctx)
        stretchHandleCount = handles.filter((id) => {
          const handle = TransformHandle.read(ctx, id)
          return (
            handle.kind === TransformHandleKind.Stretch && handle.vectorY === 0 // Left/right edge handles
          )
        }).length
      })

      await editor.tick()
      // Should have 2 stretch handles (left and right edges)
      expect(stretchHandleCount).toBe(2)
    })

    it('should swap scale handles for stretch handles when a block overrides resizeMode to free', async () => {
      let blockId: number | undefined
      let lockedKinds: string[] = []
      let unlockedKinds: string[] = []
      let relockedKinds: string[] = []

      // Kinds of every resize handle (corners and edges), rotation handles aside
      function resizeHandleKinds(ctx: Context): string[] {
        return Array.from(transformHandleQuery.current(ctx), (id) => TransformHandle.read(ctx, id).kind).filter(
          (kind) => kind !== TransformHandleKind.Rotate,
        )
      }

      // Images default to scale handles
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true, tag: 'image' })
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        lockedKinds = resizeHandleKinds(ctx)
      })

      await editor.tick()

      // Unlock the aspect ratio the way the floating menu's aspect lock does
      editor.nextTick((ctx) => {
        if (blockId === undefined) return
        Block.write(ctx, blockId).resizeMode = ResizeMode.Free

        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          UpdateTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        unlockedKinds = resizeHandleKinds(ctx)
      })

      await editor.tick()

      // Locking again clears the override, so the block def applies once more
      editor.nextTick((ctx) => {
        if (blockId === undefined) return
        Block.write(ctx, blockId).resizeMode = ResizeMode.Default

        const state = TransformBoxStateSingleton.read(ctx)
        if (state.transformBoxId !== null) {
          UpdateTransformBox.spawn(ctx, { transformBoxId: state.transformBoxId })
        }
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        relockedKinds = resizeHandleKinds(ctx)
      })

      await editor.tick()

      expect(lockedKinds.length).toBeGreaterThan(0)
      expect(lockedKinds.every((kind) => kind === TransformHandleKind.Scale)).toBe(true)
      expect(unlockedKinds).toHaveLength(lockedKinds.length)
      expect(unlockedKinds.every((kind) => kind === TransformHandleKind.Stretch)).toBe(true)
      expect(relockedKinds).toEqual(lockedKinds)
    })
  })

  describe('DragStart component', () => {
    it('should add DragStart to selected blocks', async () => {
      let blockId: number | undefined
      let hasDragStart = false

      // Create and select block - pipeline creates transform box and DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      // Check DragStart
      editor.nextTick((ctx) => {
        if (blockId !== undefined) {
          hasDragStart = hasComponent(ctx, blockId, DragStart)
        }
      })

      await editor.tick()
      expect(hasDragStart).toBe(true)
    })

    it('should set DragStart position to match block position', async () => {
      let blockId: number | undefined
      let dragStartPosition: [number, number] = [0, 0]

      // Create block at specific position - pipeline creates transform box and DragStart
      editor.nextTick((ctx) => {
        blockId = createBlock(ctx, {
          position: [123, 456],
          selected: true,
        })
      })

      await editor.tick()

      // Check DragStart position
      editor.nextTick((ctx) => {
        if (blockId !== undefined && hasComponent(ctx, blockId, DragStart)) {
          const dragStart = DragStart.read(ctx, blockId)
          dragStartPosition = [...dragStart.position] as [number, number]
        }
      })

      await editor.tick()
      expect(dragStartPosition).toEqual([123, 456])
    })
  })
})

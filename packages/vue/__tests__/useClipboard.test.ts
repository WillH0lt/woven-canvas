import {
  Aabb,
  addComponent,
  Block,
  type Context,
  createEntity,
  defineQuery,
  Editor,
  type EditorResources,
  type EntityId,
  Frame,
  getResources,
  Held,
  hasComponent,
  RankBounds,
  Selected,
  Synced,
} from '@woven-canvas/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deserializeClipboardJson, pasteEntities, serializeSelectedBlocks } from '../src/composables/useClipboard'

const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected))

describe('useClipboard', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = document.createElement('div')
    Object.defineProperty(domElement, 'clientWidth', { value: 800 })
    Object.defineProperty(domElement, 'clientHeight', { value: 600 })
    domElement.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} }) as DOMRect
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

  function addBlock(
    ctx: Context,
    options: {
      position?: [number, number]
      size?: [number, number]
      tag?: string
      parentId?: EntityId | null
      isFrame?: boolean
      selected?: boolean
    } = {},
  ): EntityId {
    const {
      position = [100, 100],
      size = [100, 100],
      tag = 'text',
      parentId = null,
      isFrame = false,
      selected = false,
    } = options

    const entityId = createEntity(ctx)
    addComponent(ctx, entityId, Block, {
      position,
      size,
      rank: RankBounds.genNext(ctx),
      tag,
      parentId,
    })
    addComponent(ctx, entityId, Aabb, {})
    Aabb.expandByBlock(ctx, entityId, entityId)
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })

    if (isFrame) {
      addComponent(ctx, entityId, Frame, { label: 'Frame' })
    }

    if (selected) {
      const { sessionId } = getResources<EditorResources>(ctx)
      addComponent(ctx, entityId, Selected, {})
      addComponent(ctx, entityId, Held, { sessionId })
    }

    return entityId
  }

  /** Serialize selected blocks → JSON string → deserialize back */
  function roundTrip(ctx: Context) {
    const json = serializeSelectedBlocks(ctx)
    if (!json) return null
    return { ...deserializeClipboardJson(ctx, JSON.stringify(json))!, center: json.center }
  }

  describe('serializeSelectedBlocks', () => {
    it('should return null when no blocks are selected', async () => {
      let result: ReturnType<typeof serializeSelectedBlocks>

      editor.nextTick((ctx) => {
        addBlock(ctx, { position: [100, 100] })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        result = serializeSelectedBlocks(ctx)
      })
      await editor.tick()

      expect(result!).toBeNull()
    })

    it('should serialize a selected root block', async () => {
      let result: ReturnType<typeof serializeSelectedBlocks>

      editor.nextTick((ctx) => {
        addBlock(ctx, { position: [200, 300], size: [50, 50], selected: true })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        result = serializeSelectedBlocks(ctx)
      })
      await editor.tick()

      expect(result).not.toBeNull()
      expect(result!.entities).toHaveLength(1)
      const block = result!.entities[0].block as Record<string, unknown>
      expect(block.position).toEqual([200, 300])
      expect(block.parentId).toBeNull()
    })

    it('should convert orphaned child to world position and clear parentId', async () => {
      let result: ReturnType<typeof serializeSelectedBlocks>

      editor.nextTick((ctx) => {
        const frameId = addBlock(ctx, {
          position: [500, 500],
          size: [400, 400],
          isFrame: true,
        })
        // Local [60, 60] → world [560, 560]
        addBlock(ctx, {
          position: [60, 60],
          size: [100, 100],
          parentId: frameId,
          selected: true,
        })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        result = serializeSelectedBlocks(ctx)
      })
      await editor.tick()

      expect(result).not.toBeNull()
      expect(result!.entities).toHaveLength(1)
      const block = result!.entities[0].block as Record<string, unknown>
      expect(block.position).toEqual([560, 560])
      expect(block.parentId).toBeNull()
    })

    it('should preserve parentId when parent is also selected', async () => {
      let result: ReturnType<typeof serializeSelectedBlocks>
      let frameUuid: string

      editor.nextTick((ctx) => {
        const frameId = addBlock(ctx, {
          position: [500, 500],
          size: [400, 400],
          isFrame: true,
          selected: true,
        })
        frameUuid = Synced.read(ctx, frameId).id
        addBlock(ctx, {
          position: [60, 60],
          size: [100, 100],
          parentId: frameId,
          selected: true,
        })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        result = serializeSelectedBlocks(ctx)
      })
      await editor.tick()

      expect(result).not.toBeNull()
      expect(result!.entities).toHaveLength(2)

      const child = result!.entities.find((e) => (e.block as Record<string, unknown>).parentId != null)
      expect(child).toBeDefined()
      const block = child!.block as Record<string, unknown>
      expect(block.position).toEqual([60, 60])
      expect(block.parentId).toBe(frameUuid!)
    })
  })

  describe('pasteEntities', () => {
    it('should offset pasted blocks to the given position', async () => {
      const pastedPositions: Array<[number, number]> = []

      editor.nextTick((ctx) => {
        addBlock(ctx, { position: [100, 100], size: [50, 50], selected: true })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        const result = roundTrip(ctx)!
        pasteEntities(ctx, result.entities, result.center, [400, 400])
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          const block = Block.read(ctx, entityId)
          pastedPositions.push([block.position[0], block.position[1]])
        }
      })
      await editor.tick()

      expect(pastedPositions).toHaveLength(1)
      // Center of original: [125, 125]. Paste at [400, 400].
      // Offset = [275, 275]. New pos = [375, 375].
      expect(pastedPositions[0]).toEqual([375, 375])
    })

    it('should assign pasted block to frame when center lands on frame', async () => {
      let frameId: EntityId
      let pastedParentId: EntityId | null = null

      editor.nextTick((ctx) => {
        frameId = addBlock(ctx, {
          position: [0, 0],
          size: [800, 800],
          isFrame: true,
        })
        addBlock(ctx, { position: [2000, 2000], size: [50, 50], selected: true })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        const result = roundTrip(ctx)!
        pasteEntities(ctx, result.entities, result.center, [400, 400])
      })
      await editor.tick()
      // Extra tick for AssignFrameChildren command
      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          pastedParentId = Block.read(ctx, entityId).parentId
        }
      })
      await editor.tick()

      expect(pastedParentId).toBe(frameId!)
    })

    it('should NOT assign pasted block to frame when center is outside frame', async () => {
      let pastedParentId: EntityId | null | undefined

      editor.nextTick((ctx) => {
        addBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          isFrame: true,
        })
        addBlock(ctx, { position: [500, 500], size: [50, 50], selected: true })
      })
      await editor.tick()

      editor.nextTick((ctx) => {
        const result = roundTrip(ctx)!
        pasteEntities(ctx, result.entities, result.center, [900, 900])
      })
      await editor.tick()
      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          pastedParentId = Block.read(ctx, entityId).parentId
        }
      })
      await editor.tick()

      expect(pastedParentId).toBeNull()
    })
  })

  describe('round-trip copy/paste', () => {
    it('should round-trip an orphaned child to the correct world position', async () => {
      let pastedPosition: [number, number] | undefined
      let pastedParentId: EntityId | null | undefined

      editor.nextTick((ctx) => {
        const frameId = addBlock(ctx, {
          position: [500, 500],
          size: [400, 400],
          isFrame: true,
        })
        addBlock(ctx, {
          position: [60, 60],
          size: [100, 100],
          parentId: frameId,
          selected: true,
        })
      })
      await editor.tick()

      // Paste far from the original frame so it doesn't get re-parented
      editor.nextTick((ctx) => {
        const result = roundTrip(ctx)!
        // World pos is [560, 560], center is [610, 610].
        // Paste at [5000, 5000] — well outside the frame.
        pasteEntities(ctx, result.entities, result.center, [5000, 5000])
      })
      await editor.tick()
      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          const block = Block.read(ctx, entityId)
          pastedPosition = [block.position[0], block.position[1]]
          pastedParentId = block.parentId
        }
      })
      await editor.tick()

      expect(pastedPosition).toBeDefined()
      // Offset = [5000 - 610, 5000 - 610] = [4390, 4390]
      // New pos = [560 + 4390, 560 + 4390] = [4950, 4950]
      expect(pastedPosition![0]).toBe(4950)
      expect(pastedPosition![1]).toBe(4950)
      expect(pastedParentId).toBeNull()
    })

    it('should preserve parent-child relationship when both are copied', async () => {
      let childParentId: EntityId | null | undefined
      let childPosition: [number, number] | undefined
      let pastedFrameId: EntityId | undefined

      // Step 1: create frame + child, both selected
      editor.nextTick((ctx) => {
        const frameId = addBlock(ctx, {
          position: [500, 500],
          size: [400, 400],
          isFrame: true,
          selected: true,
        })
        addBlock(ctx, {
          position: [60, 60],
          size: [100, 100],
          parentId: frameId,
          selected: true,
        })
      })
      await editor.tick()

      // Step 2: serialize + paste
      editor.nextTick((ctx) => {
        const result = roundTrip(ctx)!
        pasteEntities(ctx, result.entities, result.center, result.center)
      })
      await editor.tick()
      await editor.tick()

      // Step 3: inspect pasted entities
      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          if (hasComponent(ctx, entityId, Frame)) {
            pastedFrameId = entityId
          }
        }
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          if (!hasComponent(ctx, entityId, Frame)) {
            const block = Block.read(ctx, entityId)
            childParentId = block.parentId
            childPosition = [block.position[0], block.position[1]]
          }
        }
      })
      await editor.tick()

      expect(pastedFrameId).toBeDefined()
      expect(childParentId).toBe(pastedFrameId!)
      expect(childPosition).toEqual([60, 60])
    })
  })
})

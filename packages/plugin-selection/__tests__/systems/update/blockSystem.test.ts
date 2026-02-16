import {
  addComponent,
  Block,
  Cursor,
  createEntity,
  defineQuery,
  Editor,
  type EditorPlugin,
  hasComponent,
  Synced,
  Text,
} from '@infinitecanvas/core'
import { generateJitteredKeyBetween } from 'fractional-indexing-jittered'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  BringForwardSelected,
  CloneEntities,
  Copy,
  Cut,
  DeselectAll,
  DeselectBlock,
  DragBlock,
  Paste,
  RemoveBlock,
  RemoveSelected,
  SelectAll,
  SelectBlock,
  SendBackwardSelected,
  SetCursor,
  ToggleSelect,
  UncloneEntities,
} from '../../../src/commands'
import { Selected } from '../../../src/components'
import { PLUGIN_NAME } from '../../../src/constants'
import { CURSORS } from '../../../src/cursors'
import { Clipboard } from '../../../src/singletons'
import { blockSystem } from '../../../src/systems/update'
import { createBlock } from '../../testUtils'

// Generate valid fractional index keys for testing z-order
// These are pre-generated valid keys that sort in order: RANK_LOW < RANK_MID < RANK_HIGH
const RANK_LOW = generateJitteredKeyBetween(null, null)
const RANK_MID = generateJitteredKeyBetween(RANK_LOW, null)
const _RANK_HIGH = generateJitteredKeyBetween(RANK_MID, null)

// Define queries at module level
const blocksQuery = defineQuery((q) => q.with(Block))
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected))

// Factory function to create test plugin
const testPlugin: EditorPlugin = {
  name: PLUGIN_NAME,
  cursors: CURSORS,
  components: [Selected],
  singletons: [Clipboard],
  systems: [blockSystem],
}

describe('UpdateBlock', () => {
  let editor: Editor
  let domElement: HTMLDivElement

  beforeEach(async () => {
    domElement = document.createElement('div')
    document.body.appendChild(domElement)

    editor = new Editor(domElement, { plugins: [testPlugin] })
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

  describe('DragBlock command', () => {
    it('should update block position when DragBlock is spawned', async () => {
      let entityId: number | undefined
      let position: number[] | undefined

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { position: [100, 100] })
      })

      await editor.tick()

      editor.command(DragBlock, {
        entityId: entityId!,
        position: [200, 300],
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        const block = Block.read(ctx, entityId!)
        position = [...block.position]
      })

      await editor.tick()
      expect(position).toEqual([200, 300])
    })

    it('should not update position for non-block entities', async () => {
      let entityId: number | undefined

      editor.nextTick((ctx) => {
        entityId = createEntity(ctx)
        // No Block component added
      })

      await editor.tick()

      // This should not throw, just silently return
      editor.command(DragBlock, {
        entityId: entityId!,
        position: [200, 300],
      })

      await editor.tick()
      // Test passes if no error is thrown
    })
  })

  describe('SelectBlock command', () => {
    it('should add Selected component when SelectBlock is spawned', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false })
      })

      await editor.tick()

      editor.command(SelectBlock, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(true)
    })

    it('should not re-add Selected component if already selected', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      editor.command(SelectBlock, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(true)
    })

    it('should deselect others when deselectOthers is true', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let isSelected1 = false
      let isSelected2 = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true })
        entityId2 = createBlock(ctx, { position: [200, 200], selected: false })
      })

      await editor.tick()

      editor.command(SelectBlock, {
        entityId: entityId2!,
        deselectOthers: true,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected)
        isSelected2 = hasComponent(ctx, entityId2!, Selected)
      })

      await editor.tick()
      expect(isSelected1).toBe(false)
      expect(isSelected2).toBe(true)
    })

    it('should not deselect others when deselectOthers is false', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let isSelected1 = false
      let isSelected2 = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true })
        entityId2 = createBlock(ctx, { position: [200, 200], selected: false })
      })

      await editor.tick()

      editor.command(SelectBlock, {
        entityId: entityId2!,
        deselectOthers: false,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected)
        isSelected2 = hasComponent(ctx, entityId2!, Selected)
      })

      await editor.tick()
      expect(isSelected1).toBe(true)
      expect(isSelected2).toBe(true)
    })
  })

  describe('DeselectBlock command', () => {
    it('should remove Selected component when DeselectBlock is spawned', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      editor.command(DeselectBlock, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(false)
    })

    it('should do nothing if block is not selected', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false })
      })

      await editor.tick()

      editor.command(DeselectBlock, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(false)
    })
  })

  describe('ToggleSelect command', () => {
    it('should add Selected component if not selected', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false })
      })

      await editor.tick()

      editor.command(ToggleSelect, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(true)
    })

    it('should remove Selected component if selected', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: true })
      })

      await editor.tick()

      editor.command(ToggleSelect, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(false)
    })
  })

  describe('DeselectAll command', () => {
    it('should deselect all selected blocks', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let entityId3: number | undefined
      let isSelected1 = false
      let isSelected2 = false
      let isSelected3 = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true })
        entityId2 = createBlock(ctx, { position: [100, 100], selected: true })
        entityId3 = createBlock(ctx, { position: [200, 200], selected: true })
      })

      await editor.tick()

      editor.command(DeselectAll)

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected)
        isSelected2 = hasComponent(ctx, entityId2!, Selected)
        isSelected3 = hasComponent(ctx, entityId3!, Selected)
      })

      await editor.tick()
      expect(isSelected1).toBe(false)
      expect(isSelected2).toBe(false)
      expect(isSelected3).toBe(false)
    })

    it('should do nothing if no blocks are selected', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false })
      })

      await editor.tick()

      editor.command(DeselectAll)

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(false)
    })
  })

  describe('SelectAll command', () => {
    it('should select all synced blocks', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let isSelected1 = false
      let isSelected2 = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          synced: true,
          selected: false,
        })
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          synced: true,
          selected: false,
        })
      })

      await editor.tick()

      editor.command(SelectAll)

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected1 = hasComponent(ctx, entityId1!, Selected)
        isSelected2 = hasComponent(ctx, entityId2!, Selected)
      })

      await editor.tick()
      expect(isSelected1).toBe(true)
      expect(isSelected2).toBe(true)
    })

    it('should not select non-synced blocks', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          synced: false,
          selected: false,
        })
      })

      await editor.tick()

      editor.command(SelectAll)

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(false)
    })

    it('should not re-add Selected component to already selected blocks', async () => {
      let entityId: number | undefined
      let isSelected = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          synced: true,
          selected: true,
        })
      })

      await editor.tick()

      editor.command(SelectAll)

      await editor.tick()

      editor.nextTick((ctx) => {
        isSelected = hasComponent(ctx, entityId!, Selected)
      })

      await editor.tick()
      expect(isSelected).toBe(true)
    })
  })

  describe('RemoveBlock command', () => {
    it('should remove the specified block entity', async () => {
      let entityId: number | undefined
      let entityRemoved = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx)
      })

      await editor.tick()

      editor.command(RemoveBlock, { entityId: entityId! })

      await editor.tick()

      editor.nextTick((ctx) => {
        // hasComponent throws when entity doesn't exist
        try {
          hasComponent(ctx, entityId!, Block)
          entityRemoved = false
        } catch {
          entityRemoved = true
        }
      })

      await editor.tick()
      expect(entityRemoved).toBe(true)
    })
  })

  describe('RemoveSelected command', () => {
    it('should remove all selected blocks', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let entityId3: number | undefined
      let entity1Removed = false
      let entity2Removed = false
      let entity3Exists = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, { position: [0, 0], selected: true })
        entityId2 = createBlock(ctx, { position: [100, 100], selected: true })
        entityId3 = createBlock(ctx, { position: [200, 200], selected: false })
      })

      await editor.tick()

      editor.command(RemoveSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        // hasComponent throws when entity doesn't exist
        try {
          hasComponent(ctx, entityId1!, Block)
          entity1Removed = false
        } catch {
          entity1Removed = true
        }
        try {
          hasComponent(ctx, entityId2!, Block)
          entity2Removed = false
        } catch {
          entity2Removed = true
        }
        try {
          hasComponent(ctx, entityId3!, Block)
          entity3Exists = true
        } catch {
          entity3Exists = false
        }
      })

      await editor.tick()
      expect(entity1Removed).toBe(true)
      expect(entity2Removed).toBe(true)
      expect(entity3Exists).toBe(true) // Unselected block should remain
    })

    it('should do nothing if no blocks are selected', async () => {
      let entityId: number | undefined
      let hasBlock = true

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, { selected: false })
      })

      await editor.tick()

      editor.command(RemoveSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        hasBlock = hasComponent(ctx, entityId!, Block)
      })

      await editor.tick()
      expect(hasBlock).toBe(true)
    })
  })

  describe('BringForwardSelected commands', () => {
    it('should assign new ranks to selected blocks', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let rank1Before: string | undefined
      let rank2Before: string | undefined
      let rank1After: string | undefined
      let rank2After: string | undefined

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: RANK_LOW,
          selected: true,
        })
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: RANK_MID,
          selected: false,
        })
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        rank1Before = Block.read(ctx, entityId1!).rank
        rank2Before = Block.read(ctx, entityId2!).rank
      })

      await editor.tick()

      editor.command(BringForwardSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank
        rank2After = Block.read(ctx, entityId2!).rank
      })

      await editor.tick()

      // Selected block should have a new rank
      expect(rank1After).not.toBe(rank1Before)
      // Unselected block should keep its rank
      expect(rank2After).toBe(rank2Before)
    })

    it('should do nothing if no blocks are selected', async () => {
      let entityId: number | undefined
      let rankBefore: string | undefined
      let rankAfter: string | undefined

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          rank: RANK_MID,
          selected: false,
        })
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        rankBefore = Block.read(ctx, entityId!).rank
      })

      await editor.tick()

      editor.command(BringForwardSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        rankAfter = Block.read(ctx, entityId!).rank
      })

      await editor.tick()
      expect(rankAfter).toBe(rankBefore)
    })
  })

  describe('SendBackwardSelected commands', () => {
    it('should assign new ranks to selected blocks', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let rank1Before: string | undefined
      let rank2Before: string | undefined
      let rank1After: string | undefined
      let rank2After: string | undefined

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          rank: RANK_MID,
          selected: true,
        })
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          rank: RANK_LOW,
          selected: false,
        })
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        rank1Before = Block.read(ctx, entityId1!).rank
        rank2Before = Block.read(ctx, entityId2!).rank
      })

      await editor.tick()

      editor.command(SendBackwardSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        rank1After = Block.read(ctx, entityId1!).rank
        rank2After = Block.read(ctx, entityId2!).rank
      })

      await editor.tick()

      // Selected block should have a new rank
      expect(rank1After).not.toBe(rank1Before)
      // Unselected block should keep its rank
      expect(rank2After).toBe(rank2Before)
    })

    it('should do nothing if no blocks are selected', async () => {
      let entityId: number | undefined
      let rankBefore: string | undefined
      let rankAfter: string | undefined

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [0, 0],
          rank: RANK_MID,
          selected: false,
        })
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        rankBefore = Block.read(ctx, entityId!).rank
      })

      await editor.tick()

      editor.command(SendBackwardSelected)

      await editor.tick()

      editor.nextTick((ctx) => {
        rankAfter = Block.read(ctx, entityId!).rank
      })

      await editor.tick()
      expect(rankAfter).toBe(rankBefore)
    })
  })

  describe('SetCursor command', () => {
    it('should set the cursor kind and rotation', async () => {
      let cursorKind: string | undefined
      let rotation: number | undefined

      editor.command(SetCursor, { cursorKind: 'drag', rotation: 0.5 })

      await editor.tick()

      editor.nextTick((ctx) => {
        const cursor = Cursor.read(ctx)
        cursorKind = cursor.cursorKind
        rotation = cursor.rotation
      })

      await editor.tick()
      expect(cursorKind).toBe('drag')
      expect(rotation).toBe(0.5)
    })

    it('should set the context cursor kind and rotation', async () => {
      let contextCursorKind: string | undefined
      let contextRotation: number | undefined

      editor.command(SetCursor, {
        contextCursorKind: 'nesw',
        contextRotation: 1.0,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        const cursor = Cursor.read(ctx)
        contextCursorKind = cursor.contextCursorKind
        contextRotation = cursor.contextRotation
      })

      await editor.tick()
      expect(contextCursorKind).toBe('nesw')
      expect(contextRotation).toBe(1.0)
    })

    it('should set both base and context cursor', async () => {
      let cursorKind: string | undefined
      let contextCursorKind: string | undefined

      editor.command(SetCursor, {
        cursorKind: 'ns',
        contextCursorKind: 'ew',
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        const cursor = Cursor.read(ctx)
        cursorKind = cursor.cursorKind
        contextCursorKind = cursor.contextCursorKind
      })

      await editor.tick()
      expect(cursorKind).toBe('ns')
      expect(contextCursorKind).toBe('ew')
    })

    it('should not modify base cursor if only context cursor is provided', async () => {
      let cursorKind: string | undefined

      // First set base cursor
      editor.command(SetCursor, { cursorKind: 'drag' })
      await editor.tick()

      // Then set only context cursor
      editor.command(SetCursor, { contextCursorKind: 'nesw' })
      await editor.tick()

      editor.nextTick((ctx) => {
        cursorKind = Cursor.read(ctx).cursorKind
      })

      await editor.tick()
      expect(cursorKind).toBe('drag')
    })

    it('should not modify context cursor if only base cursor is provided', async () => {
      let contextCursorKind: string | undefined

      // First set context cursor
      editor.command(SetCursor, { contextCursorKind: 'nesw' })
      await editor.tick()

      // Then set only base cursor
      editor.command(SetCursor, { cursorKind: 'drag' })
      await editor.tick()

      editor.nextTick((ctx) => {
        contextCursorKind = Cursor.read(ctx).contextCursorKind
      })

      await editor.tick()
      expect(contextCursorKind).toBe('nesw')
    })

    it('should clear context cursor when empty string is provided', async () => {
      let contextCursorKind: string | undefined

      // First set context cursor
      editor.command(SetCursor, { contextCursorKind: 'nesw' })
      await editor.tick()

      // Clear it
      editor.command(SetCursor, { contextCursorKind: '' })
      await editor.tick()

      editor.nextTick((ctx) => {
        contextCursorKind = Cursor.read(ctx).contextCursorKind
      })

      await editor.tick()
      expect(contextCursorKind).toBe('')
    })
  })

  describe('Copy command', () => {
    it('should copy selected blocks to clipboard', async () => {
      let _entityId: number | undefined
      let clipboardCount = 0

      editor.nextTick((ctx) => {
        _entityId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.nextTick((ctx) => {
        clipboardCount = Clipboard.read(ctx).count
      })

      await editor.tick()
      expect(clipboardCount).toBe(1)
    })

    it('should copy multiple selected blocks', async () => {
      let clipboardCount = 0

      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [0, 0],
          size: [50, 50],
          selected: true,
          synced: true,
        })
        createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
          synced: true,
        })
        createBlock(ctx, {
          position: [200, 200],
          size: [50, 50],
          selected: false,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.nextTick((ctx) => {
        clipboardCount = Clipboard.read(ctx).count
      })

      await editor.tick()
      expect(clipboardCount).toBe(2)
    })

    it('should do nothing if no blocks are selected', async () => {
      let clipboardCount = 0

      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [0, 0],
          selected: false,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.nextTick((ctx) => {
        clipboardCount = Clipboard.read(ctx).count
      })

      await editor.tick()
      expect(clipboardCount).toBe(0)
    })

    it('should calculate correct center for clipboard', async () => {
      let center: [number, number] | undefined

      editor.nextTick((ctx) => {
        // Block at [0, 0] with size [100, 100] -> AABB [0, 0, 100, 100]
        createBlock(ctx, {
          position: [0, 0],
          size: [100, 100],
          selected: true,
          synced: true,
        })
        // Block at [100, 100] with size [100, 100] -> AABB [100, 100, 200, 200]
        createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.nextTick((ctx) => {
        center = [...Clipboard.read(ctx).center] as [number, number]
      })

      await editor.tick()
      // Union AABB is [0, 0, 200, 200], center is [100, 100]
      expect(center).toEqual([100, 100])
    })
  })

  describe('Cut command', () => {
    it('should copy selected blocks to clipboard and remove them', async () => {
      let entityId: number | undefined
      let clipboardCount = 0
      let entityRemoved = false

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Cut)

      await editor.tick()

      editor.nextTick((ctx) => {
        clipboardCount = Clipboard.read(ctx).count
        try {
          hasComponent(ctx, entityId!, Block)
          entityRemoved = false
        } catch {
          entityRemoved = true
        }
      })

      await editor.tick()
      expect(clipboardCount).toBe(1)
      expect(entityRemoved).toBe(true)
    })

    it('should remove all selected blocks after copying', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let entityId3: number | undefined
      let entity1Removed = false
      let entity2Removed = false
      let entity3Exists = false

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [0, 0],
          selected: true,
          synced: true,
        })
        entityId2 = createBlock(ctx, {
          position: [100, 100],
          selected: true,
          synced: true,
        })
        entityId3 = createBlock(ctx, {
          position: [200, 200],
          selected: false,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Cut)

      await editor.tick()

      editor.nextTick((ctx) => {
        try {
          hasComponent(ctx, entityId1!, Block)
          entity1Removed = false
        } catch {
          entity1Removed = true
        }
        try {
          hasComponent(ctx, entityId2!, Block)
          entity2Removed = false
        } catch {
          entity2Removed = true
        }
        try {
          hasComponent(ctx, entityId3!, Block)
          entity3Exists = true
        } catch {
          entity3Exists = false
        }
      })

      await editor.tick()
      expect(entity1Removed).toBe(true)
      expect(entity2Removed).toBe(true)
      expect(entity3Exists).toBe(true)
    })
  })

  describe('Paste command', () => {
    it('should create new entities from clipboard', async () => {
      let _originalEntityId: number | undefined
      let pastedBlockCount = 0

      editor.nextTick((ctx) => {
        _originalEntityId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      // Deselect original
      editor.command(DeselectAll)

      await editor.tick()

      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        // Count blocks (original + pasted)
        pastedBlockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(pastedBlockCount).toBe(2) // Original + pasted
    })

    it('should paste at screen center when no position provided', async () => {
      let pastedPosition: [number, number] | undefined

      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.command(DeselectAll)

      await editor.tick()

      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        // Find the selected (pasted) block
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          const block = Block.read(ctx, entityId)
          pastedPosition = [...block.position] as [number, number]
        }
      })

      await editor.tick()
      // Block at [100, 100] with size [50, 50] has center at [125, 125]
      // Screen center is [0, 0] (default screen size is 0x0)
      // Offset = screenCenter - clipboardCenter = [0, 0] - [125, 125] = [-125, -125]
      // New position = original + offset = [100, 100] + [-125, -125] = [-25, -25]
      expect(pastedPosition).toEqual([-25, -25])
    })

    it('should paste at specified position', async () => {
      let pastedPosition: [number, number] | undefined

      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [100, 100],
          size: [100, 100],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.command(DeselectAll)

      await editor.tick()

      // Paste at position [500, 500]
      // Original block center is at [150, 150] (position + size/2)
      // Clipboard center should be [150, 150]
      editor.command(Paste, { position: [500, 500] })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          const block = Block.read(ctx, entityId)
          pastedPosition = [...block.position] as [number, number]
        }
      })

      await editor.tick()
      // Offset = [500, 500] - [150, 150] = [350, 350]
      // New position = [100, 100] + [350, 350] = [450, 450]
      expect(pastedPosition).toEqual([450, 450])
    })

    it('should select pasted blocks', async () => {
      let pastedIsSelected = false
      let originalIsSelected = false
      let originalEntityId: number | undefined

      editor.nextTick((ctx) => {
        originalEntityId = createBlock(ctx, {
          position: [100, 100],
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        originalIsSelected = hasComponent(ctx, originalEntityId!, Selected)
        // Find the other selected block (the pasted one)
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          if (entityId !== originalEntityId) {
            pastedIsSelected = true
          }
        }
      })

      await editor.tick()
      expect(originalIsSelected).toBe(false) // Original should be deselected
      expect(pastedIsSelected).toBe(true) // Pasted should be selected
    })

    it('should assign new ranks to pasted blocks', async () => {
      let originalRank: string | undefined
      let pastedRank: string | undefined
      let originalEntityId: number | undefined

      editor.nextTick((ctx) => {
        originalEntityId = createBlock(ctx, {
          position: [100, 100],
          rank: RANK_MID,
          selected: true,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        originalRank = Block.read(ctx, originalEntityId!).rank
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          if (entityId !== originalEntityId) {
            pastedRank = Block.read(ctx, entityId).rank
          }
        }
      })

      await editor.tick()
      expect(originalRank).toBe(RANK_MID)
      expect(pastedRank).not.toBe(RANK_MID)
      expect(pastedRank).toBeDefined()
    })

    it('should do nothing if clipboard is empty', async () => {
      let blockCount = 0

      editor.nextTick((ctx) => {
        createBlock(ctx, {
          position: [100, 100],
          selected: false,
          synced: true,
        })
      })

      await editor.tick()

      // Paste without copying first
      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(1) // Only the original block
    })

    it('should copy Text component along with Block', async () => {
      let pastedHasText = false
      let pastedTextContent: string | undefined

      editor.nextTick((ctx) => {
        const entityId = createBlock(ctx, {
          position: [100, 100],
          selected: true,
          synced: true,
        })
        addComponent(ctx, entityId, Text, { content: 'Hello World' })
      })

      await editor.tick()

      editor.command(Copy)

      await editor.tick()

      editor.command(DeselectAll)

      await editor.tick()

      editor.command(Paste, {})

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const entityId of selectedBlocksQuery.current(ctx)) {
          pastedHasText = hasComponent(ctx, entityId, Text)
          if (pastedHasText) {
            pastedTextContent = Text.read(ctx, entityId).content
          }
        }
      })

      await editor.tick()
      expect(pastedHasText).toBe(true)
      expect(pastedTextContent).toBe('Hello World')
    })
  })

  describe('CloneEntities command', () => {
    it('should create a clone of a synced entity', async () => {
      let entityId: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          synced: true,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(2) // Original + clone
    })

    it('should apply offset to cloned entity position', async () => {
      let entityId: number | undefined
      let originalPosition: [number, number] | undefined
      let clonedPosition: [number, number] | undefined
      const seed = 'test-seed'
      const offset: [number, number] = [-50, -50]

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          size: [50, 50],
          synced: true,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset,
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const blockId of blocksQuery.current(ctx)) {
          const block = Block.read(ctx, blockId)
          if (blockId === entityId) {
            originalPosition = [...block.position] as [number, number]
          } else {
            clonedPosition = [...block.position] as [number, number]
          }
        }
      })

      await editor.tick()
      expect(originalPosition).toEqual([100, 100])
      // Clone should be at original position + offset
      expect(clonedPosition).toEqual([50, 50])
    })

    it('should assign a rank behind the original', async () => {
      let entityId: number | undefined
      let originalRank: string | undefined
      let clonedRank: string | undefined
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          rank: RANK_MID,
          synced: true,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const blockId of blocksQuery.current(ctx)) {
          const block = Block.read(ctx, blockId)
          if (blockId === entityId) {
            originalRank = block.rank
          } else {
            clonedRank = block.rank
          }
        }
      })

      await editor.tick()
      expect(originalRank).toBe(RANK_MID)
      expect(clonedRank).toBeDefined()
      // Clone rank should be before original (lexicographically smaller)
      expect(clonedRank! < originalRank!).toBe(true)
    })

    it('should clone multiple entities', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
        entityId2 = createBlock(ctx, {
          position: [200, 200],
          synced: true,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId1!, entityId2!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(4) // 2 originals + 2 clones
    })

    it('should generate deterministic clone IDs based on seed', async () => {
      let entityId: number | undefined
      let cloneSyncedId1: string | undefined
      let cloneSyncedId2: string | undefined
      const seed = 'deterministic-seed'

      // First clone operation
      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const blockId of blocksQuery.current(ctx)) {
          if (blockId !== entityId) {
            cloneSyncedId1 = Synced.read(ctx, blockId).id
          }
        }
      })

      await editor.tick()

      // Remove clone and do it again with same seed
      editor.command(UncloneEntities, {
        entityIds: [entityId!],
        seed,
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const blockId of blocksQuery.current(ctx)) {
          if (blockId !== entityId) {
            cloneSyncedId2 = Synced.read(ctx, blockId).id
          }
        }
      })

      await editor.tick()
      // Same seed should produce same synced ID
      expect(cloneSyncedId1).toBe(cloneSyncedId2)
    })

    it('should not clone non-synced entities', async () => {
      let entityId: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: false,
        })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(1) // Only original, no clone
    })

    it('should copy Text component to clone', async () => {
      let entityId: number | undefined
      let cloneHasText = false
      let cloneTextContent: string | undefined
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
        addComponent(ctx, entityId, Text, { content: 'Cloned Text' })
      })

      await editor.tick()

      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        for (const blockId of blocksQuery.current(ctx)) {
          if (blockId !== entityId) {
            cloneHasText = hasComponent(ctx, blockId, Text)
            if (cloneHasText) {
              cloneTextContent = Text.read(ctx, blockId).content
            }
          }
        }
      })

      await editor.tick()
      expect(cloneHasText).toBe(true)
      expect(cloneTextContent).toBe('Cloned Text')
    })
  })

  describe('UncloneEntities command', () => {
    it('should remove cloned entity by seed', async () => {
      let entityId: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
      })

      await editor.tick()

      // Clone first
      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(2) // Original + clone

      // Now unclone
      editor.command(UncloneEntities, {
        entityIds: [entityId!],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(1) // Only original remains
    })

    it('should only remove clone with matching seed', async () => {
      let entityId: number | undefined
      let blockCount = 0
      const cloneSeed = 'clone-seed'
      const wrongSeed = 'wrong-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
      })

      await editor.tick()

      // Clone with one seed
      editor.command(CloneEntities, {
        entityIds: [entityId!],
        offset: [0, 0],
        seed: cloneSeed,
      })

      await editor.tick()

      // Try to unclone with different seed
      editor.command(UncloneEntities, {
        entityIds: [entityId!],
        seed: wrongSeed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      // Clone should still exist (wrong seed used)
      expect(blockCount).toBe(2)
    })

    it('should unclone multiple entities', async () => {
      let entityId1: number | undefined
      let entityId2: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId1 = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
        entityId2 = createBlock(ctx, {
          position: [200, 200],
          synced: true,
        })
      })

      await editor.tick()

      // Clone both
      editor.command(CloneEntities, {
        entityIds: [entityId1!, entityId2!],
        offset: [0, 0],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(4) // 2 originals + 2 clones

      // Unclone both
      editor.command(UncloneEntities, {
        entityIds: [entityId1!, entityId2!],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(2) // Only originals remain
    })

    it('should do nothing if clone does not exist', async () => {
      let entityId: number | undefined
      let blockCount = 0
      const seed = 'test-seed'

      editor.nextTick((ctx) => {
        entityId = createBlock(ctx, {
          position: [100, 100],
          synced: true,
        })
      })

      await editor.tick()

      // Try to unclone without cloning first
      editor.command(UncloneEntities, {
        entityIds: [entityId!],
        seed,
      })

      await editor.tick()

      editor.nextTick((ctx) => {
        blockCount = Array.from(blocksQuery.current(ctx)).length
      })

      await editor.tick()
      expect(blockCount).toBe(1) // Original still exists
    })
  })
})

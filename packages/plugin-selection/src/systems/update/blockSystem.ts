import {
  addComponent,
  Block,
  Connector,
  type Context,
  Cursor,
  createEntity,
  defineEditorSystem,
  defineQuery,
  type EditorResources,
  type EntityId,
  getBackrefs,
  getResources,
  Held,
  hasComponent,
  isAlive,
  on,
  RankBounds,
  removeComponent,
  removeEntity,
  Synced,
} from '@woven-canvas/core'

import { Vec2 } from '@woven-canvas/math'
import {
  AddHeld,
  BringForwardSelected,
  CloneEntities,
  DeselectAll,
  DeselectBlock,
  DragBlock,
  RemoveBlock,
  RemoveHeld,
  RemoveSelected,
  SelectAll,
  SelectBlock,
  SendBackwardSelected,
  SetCursor,
  ToggleSelect,
  UncloneEntities,
} from '../../commands'
import { Selected } from '../../components'
import { deselectBlock, generateUuidBySeed, selectBlock } from '../../helpers'

// Query for locally selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected))

// Query for synced blocks
const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced))

/**
 * Block update system - handles block manipulation commands.
 *
 * Processes:
 * - SelectBlock, DeselectBlock, ToggleSelect, DeselectAll, SelectAll
 * - RemoveBlock, RemoveSelected
 * - DragBlock
 * - BringForwardSelected, SendBackwardSelected
 * - SetCursor
 */
export const blockSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, DragBlock, (ctx, { entityId, position }) => {
    if (!hasComponent(ctx, entityId, Block)) return
    const block = Block.write(ctx, entityId)
    block.position = position
  })

  on(ctx, SelectBlock, (ctx, { entityId, deselectOthers }) => {
    if (deselectOthers) {
      deselectAllBlocks(ctx)
    }
    selectBlock(ctx, entityId)
  })

  on(ctx, DeselectBlock, (ctx, { entityId }) => {
    deselectBlock(ctx, entityId)
  })

  on(ctx, ToggleSelect, (ctx, { entityId }) => {
    if (hasComponent(ctx, entityId, Selected)) {
      deselectBlock(ctx, entityId)
    } else {
      selectBlock(ctx, entityId)
    }
  })

  on(ctx, DeselectAll, deselectAllBlocks)

  on(ctx, AddHeld, (ctx, { entityId }) => {
    if (!hasComponent(ctx, entityId, Synced)) return
    if (hasComponent(ctx, entityId, Held)) return

    const { sessionId } = getResources<EditorResources>(ctx)
    addComponent(ctx, entityId, Held, { sessionId })
  })

  on(ctx, RemoveHeld, (ctx, { entityId }) => {
    // Only remove Held if not selected (selected blocks should keep Held)
    if (hasComponent(ctx, entityId, Selected)) return
    if (!hasComponent(ctx, entityId, Held)) return

    removeComponent(ctx, entityId, Held)
  })

  on(ctx, SelectAll, (ctx) => {
    for (const entityId of syncedBlocksQuery.current(ctx)) {
      selectBlock(ctx, entityId)
    }
  })

  on(ctx, RemoveBlock, (ctx, { entityId }) => {
    removeEntity(ctx, entityId)
  })

  on(ctx, RemoveSelected, (ctx) => {
    for (const entityId of selectedBlocksQuery.current(ctx)) {
      removeEntity(ctx, entityId)
    }
  })

  on(ctx, BringForwardSelected, bringForwardSelected)
  on(ctx, SendBackwardSelected, sendBackwardSelected)

  on(ctx, SetCursor, (ctx, payload) => {
    if (payload.cursorKind !== undefined) {
      Cursor.setCursor(ctx, payload.cursorKind, payload.rotation ?? 0)
    }
    if (payload.contextCursorKind !== undefined) {
      Cursor.setContextCursor(ctx, payload.contextCursorKind, payload.contextRotation ?? 0)
    }
    // Allow clearing context cursor by passing empty string
    if (payload.contextCursorKind === '') {
      Cursor.clearContextCursor(ctx)
    }
  })

  on(ctx, CloneEntities, (ctx, { entityIds, offset, seed }) => {
    cloneEntities(ctx, entityIds, offset, seed)
  })

  on(ctx, UncloneEntities, (ctx, { entityIds, seed }) => {
    uncloneEntities(ctx, entityIds, seed)
  })
})

/**
 * Deselect all blocks selected by the current session.
 */
function deselectAllBlocks(ctx: Context): void {
  for (const entityId of selectedBlocksQuery.current(ctx)) {
    deselectBlock(ctx, entityId)
  }
}

/**
 * Bring selected blocks to front (generate new ranks).
 * Only affects blocks selected by the current session.
 */
function bringForwardSelected(ctx: Context): void {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)]
  if (selectedBlocks.length === 0) return

  // Sort by current rank (ascending)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a)
    const blockB = Block.read(ctx, b)
    if (!blockA.rank && !blockB.rank) return 0
    if (!blockA.rank) return -1
    if (!blockB.rank) return 1
    if (blockA.rank < blockB.rank) return -1
    if (blockA.rank > blockB.rank) return 1
    return 0
  })

  // Assign new ranks at the front
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId)
    block.rank = RankBounds.genNext(ctx)
  }
}

/**
 * Send selected blocks to back (generate new ranks).
 * Only affects blocks selected by the current session.
 */
function sendBackwardSelected(ctx: Context): void {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)]
  if (selectedBlocks.length === 0) return

  // Sort by current rank (descending - process highest rank first)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a)
    const blockB = Block.read(ctx, b)
    if (!blockA.rank && !blockB.rank) return 0
    if (!blockA.rank) return 1
    if (!blockB.rank) return -1
    if (blockB.rank < blockA.rank) return -1
    if (blockB.rank > blockA.rank) return 1
    return 0
  })

  // Assign new ranks at the back
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId)
    block.rank = RankBounds.genPrev(ctx)
  }
}

/**
 * Clone entities with deterministic UUIDs.
 * Creates clones at the original position (offset applied to originals during drag).
 */
function cloneEntities(ctx: Context, entityIds: EntityId[], offset: Vec2, seed: string): void {
  const { componentsById } = getResources<EditorResources>(ctx)
  const documentComponents = new Map([...componentsById].filter(([, def]) => def.sync === 'document'))
  const syncedComponentId = Synced._getComponentId(ctx)
  const blockComponentId = Block._getComponentId(ctx)

  // Pre-compute clone ranks: all clones go below all originals, preserving relative order.
  // 1. Collect original ranks and sort ascending
  const entityIdSet = new Set(entityIds)
  const sortedEntities = entityIds
    .filter((id) => hasComponent(ctx, id, Block))
    .sort((a, b) => {
      const rankA = Block.read(ctx, a).rank
      const rankB = Block.read(ctx, b).rank
      return rankA < rankB ? -1 : rankA > rankB ? 1 : 0
    })

  // 2. Find the highest rank below the lowest original, excluding selected entities
  const lowestOriginalRank = sortedEntities.length > 0 ? Block.read(ctx, sortedEntities[0]).rank : null
  let prevRank: string | null = null
  if (lowestOriginalRank !== null) {
    for (const blockId of syncedBlocksQuery.current(ctx)) {
      if (entityIdSet.has(blockId)) continue
      const block = Block.read(ctx, blockId)
      if (block.rank < lowestOriginalRank && (prevRank === null || block.rank > prevRank)) {
        prevRank = block.rank
      }
    }
  }

  // 3. Generate clone ranks in order between prevRank and lowestOriginalRank
  const cloneRankMap = new Map<EntityId, string>()
  for (const entityId of sortedEntities) {
    const rank = RankBounds.genBetween(prevRank, lowestOriginalRank)
    cloneRankMap.set(entityId, rank)
    prevRank = rank
  }

  // Build map during clone creation: original EntityId -> clone EntityId
  const originalToClone = new Map<EntityId, EntityId>()

  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue

    const synced = Synced.read(ctx, entityId)
    const cloneId = generateUuidBySeed(synced.id, seed)

    // Create new entity for the clone
    const cloneEntityId = createEntity(ctx)
    originalToClone.set(entityId, cloneEntityId)

    // Add Synced with deterministic UUID
    addComponent(ctx, cloneEntityId, Synced, { id: cloneId })

    // Copy all document components
    for (const componentId of ctx.entityBuffer.getComponentIds(entityId)) {
      if (componentId === syncedComponentId) continue

      const componentDef = documentComponents.get(componentId)
      if (!componentDef) continue

      // Clone the data to avoid mutating original
      const data = {
        ...(componentDef.snapshot(ctx, entityId) as Record<string, unknown>),
      }

      // For Block component: apply offset and assign pre-computed rank
      if (componentId === blockComponentId) {
        const pos = Vec2.clone(data.position as Vec2)
        Vec2.add(pos, offset)
        data.position = pos
        data.rank = cloneRankMap.get(entityId) ?? RankBounds.genBetween(prevRank, lowestOriginalRank)
      }

      addComponent(ctx, cloneEntityId, componentDef, data as any)
    }
  }

  // Swap connectors to point to clones (which stay in place)
  swapConnectorRefs(ctx, originalToClone)
}

/**
 * Remove cloned entities by regenerating their deterministic UUIDs.
 */
function uncloneEntities(ctx: Context, entityIds: EntityId[], seed: string): void {
  // Step 1: Calculate expected clone UUIDs
  const expectedCloneUuids = new Set<string>()
  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue
    const synced = Synced.read(ctx, entityId)
    expectedCloneUuids.add(generateUuidBySeed(synced.id, seed))
  }

  // Step 2: Find clone entities
  const clonesToRemove: EntityId[] = []
  for (const entityId of syncedBlocksQuery.current(ctx)) {
    const synced = Synced.read(ctx, entityId)
    if (expectedCloneUuids.has(synced.id)) {
      clonesToRemove.push(entityId)
    }
  }

  // Step 3: Build swap map (clone -> original) and swap connector refs
  const cloneToOriginal = new Map<EntityId, EntityId>()
  for (const cloneId of clonesToRemove) {
    const cloneUuid = Synced.read(ctx, cloneId).id
    // Find the original that generated this clone
    for (const originalId of entityIds) {
      if (!hasComponent(ctx, originalId, Synced)) continue
      const originalUuid = Synced.read(ctx, originalId).id
      if (generateUuidBySeed(originalUuid, seed) === cloneUuid) {
        cloneToOriginal.set(cloneId, originalId)
        break
      }
    }
  }
  swapConnectorRefs(ctx, cloneToOriginal)

  // Step 4: Remove clones
  for (const cloneId of clonesToRemove) {
    removeEntity(ctx, cloneId)
  }
}

/**
 * Swap connector references from one set of entities to another.
 *
 * Updates connector startBlock/endBlock refs: any connector pointing to
 * a key in the map will be updated to point to the corresponding value.
 *
 * Used for:
 * - cloneEntities: connectors pointing to originals -> point to clones
 * - uncloneEntities: connectors pointing to clones -> point back to originals
 */
function swapConnectorRefs(ctx: Context, fromTo: Map<EntityId, EntityId>): void {
  for (const [fromId, toId] of fromTo) {
    // Find connectors where this entity is the startBlock
    for (const connectorId of getBackrefs(ctx, fromId, Connector, 'startBlock')) {
      if (!isAlive(ctx, connectorId)) continue
      Connector.write(ctx, connectorId).startBlock = toId
    }

    // Find connectors where this entity is the endBlock
    for (const connectorId of getBackrefs(ctx, fromId, Connector, 'endBlock')) {
      if (!isAlive(ctx, connectorId)) continue
      Connector.write(ctx, connectorId).endBlock = toId
    }
  }
}

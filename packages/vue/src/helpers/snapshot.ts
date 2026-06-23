import {
  addComponent,
  Block,
  type Context,
  createEntity,
  type EntityId,
  Grid,
  getBlockDef,
  RankBounds,
  Synced,
} from '@woven-canvas/core'

/**
 * Snapshot format for creating blocks.
 * Keys are component names (lowercase), values are component data.
 */
export type BlockSnapshot = Record<string, unknown> & {
  block: {
    tag: string
    size?: [number, number]
    rank?: string
  }
}

/**
 * Fill in a placement snapshot's omitted component fields from the canvas
 * creation defaults (`setDefaults`/`getDefaults`, threaded into ECS via the
 * editing plugin's `getDefaults` resource). Registered defaults are merged UNDER
 * each component the snapshot already mentions, so explicit snapshot values
 * always win, but a field the snapshot leaves undefined (e.g. `text.fontFamily`)
 * falls back to the last value set there.
 *
 * Call this from the interactive placement paths (toolbar click-to-place,
 * drag-out, double-click) — NOT from `createBlockFromSnapshot` itself, which
 * stays a faithful primitive (paste, draw, programmatic creation must reproduce
 * their snapshot exactly, without surprise defaults).
 */
export function applyCreationDefaults(
  snapshot: BlockSnapshot,
  getDefaults?: (component: string) => Record<string, unknown>,
): BlockSnapshot {
  if (!getDefaults) return snapshot

  let merged: BlockSnapshot | null = null
  for (const key of Object.keys(snapshot)) {
    if (key === 'block') continue
    const defaults = getDefaults(key)
    if (!defaults || Object.keys(defaults).length === 0) continue
    merged ??= { ...snapshot }
    merged[key] = { ...defaults, ...(snapshot[key] as object) }
  }
  return merged ?? snapshot
}

/**
 * Parse the snapshot from Controls.heldSnapshot.
 */
export function parseSnapshot(heldSnapshot: string): BlockSnapshot | null {
  if (!heldSnapshot) return null

  try {
    const snapshot = JSON.parse(heldSnapshot) as BlockSnapshot
    if (!snapshot.block?.tag) {
      console.warn('Block snapshot missing required tag:', snapshot)
      return null
    }
    return snapshot
  } catch {
    console.warn('Invalid block snapshot JSON:', heldSnapshot)
    return null
  }
}

/**
 * Create the block entity from snapshot at the given position.
 * The block is centered on the position and snapped to grid.
 */
export function createBlockFromSnapshot(ctx: Context, snapshot: BlockSnapshot, position: [number, number]): EntityId {
  const blockDef = getBlockDef(ctx, snapshot.block.tag)
  if (!blockDef) {
    throw new Error(`Block placement: block definition for tag "${snapshot.block.tag}" not found`)
  }

  // Get size from snapshot or use defaults
  const size: [number, number] = snapshot.block.size ?? [100, 100]

  // Calculate position to center the block on click point, then snap to grid
  const placedPosition: [number, number] = [position[0] - size[0] / 2, position[1] - size[1] / 2]
  Grid.snapPosition(ctx, placedPosition)
  const [left, top] = placedPosition

  // Generate a rank for the new block (place at front)
  const rank = snapshot.block.rank ?? RankBounds.genNext(ctx)

  // Create the entity
  const entityId = createEntity(ctx)

  // Add Synced component for persistence (unless explicitly in snapshot)
  if (!('synced' in snapshot)) {
    addComponent(ctx, entityId, Synced, {
      id: crypto.randomUUID(),
    })
  }

  // Add Block component with computed position and rank
  const blockData = Object.assign({}, snapshot.block, {
    position: [left, top] as [number, number],
    size,
    rank,
  })
  addComponent(ctx, entityId, Block, blockData)

  for (const Comp of blockDef.components) {
    if (!(Comp.name in snapshot)) {
      addComponent(ctx, entityId, Comp)
    } else {
      const componentData = snapshot[Comp.name] as object
      addComponent(ctx, entityId, Comp, componentData)
    }
  }

  return entityId
}

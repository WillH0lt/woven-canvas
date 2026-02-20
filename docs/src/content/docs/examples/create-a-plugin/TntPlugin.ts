import type { Context, EditorPlugin } from '@woven-canvas/core'
import {
  Block,
  defineCommand,
  defineEditorSystem,
  defineQuery,
  field,
  intersectAabb,
  Key,
  on,
  removeEntity,
} from '@woven-canvas/core'
import type { Aabb } from '@woven-canvas/math'
import { defineCanvasComponent } from '@woven-canvas/vue'

// ============================================================================
// Components
// ============================================================================

/**
 * Marker component for TNT blocks.
 */
export const Tnt = defineCanvasComponent(
  { name: 'tnt', sync: 'document' },
  {
    // Could add properties like fuse length, blast power, etc.
    blastRadius: field.float64().default(100),
  },
)

/**
 * Marker component for Rock blocks.
 */
export const Rock = defineCanvasComponent(
  { name: 'rock', sync: 'document' },
  {
    // Could add properties like hardness, size, etc.
    hardness: field.float64().default(1),
  },
)

// ============================================================================
// Commands
// ============================================================================

/**
 * Command to trigger TNT explosion.
 * Spawned by the Explode button or Space keybind.
 */
export const Explode = defineCommand<void>('explode')

// ============================================================================
// Queries
// ============================================================================

const tntQuery = defineQuery((q) => q.with(Block, Tnt))
const rockQuery = defineQuery((q) => q.with(Block, Rock))

// ============================================================================
// Systems
// ============================================================================

/**
 * Handle TNT explosion:
 * 1. Find all TNT blocks
 * 2. For each TNT, find all rocks within blast radius
 * 3. Delete the TNT and nearby rocks
 */
function handleExplode(ctx: Context): void {
  // Get all TNT blocks
  const tntEntities = tntQuery.current(ctx)
  if (tntEntities.length === 0) return

  // Get all rock blocks
  const rockEntities = rockQuery.current(ctx)

  const toDelete = new Set<number>()

  for (const tntId of tntEntities) {
    // Get TNT position and blast radius
    const tnt = Tnt.read(ctx, tntId)
    const center = Block.getCenter(ctx, tntId)
    const radius = tnt.blastRadius

    // Create blast area AABB
    const blastBounds: Aabb = [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius]

    // Find all rocks in blast radius
    const nearbyEntities = intersectAabb(ctx, blastBounds, rockEntities)

    for (const rockId of nearbyEntities) {
      toDelete.add(rockId)
    }

    // Mark TNT for deletion
    toDelete.add(tntId)
  }

  // Remove all affected entities
  for (const id of toDelete) {
    removeEntity(ctx, id)
  }
}

/**
 * System that handles TNT explosions.
 */
const explodeSystem = defineEditorSystem({ phase: 'update' }, (ctx: Context) => {
  on(ctx, Explode, handleExplode)
})

// ============================================================================
// Keybinds
// ============================================================================

const keybinds = [
  {
    command: Explode.name,
    key: Key.Space,
  },
]

// ============================================================================
// Plugin Export
// ============================================================================

/**
 * TNT Plugin - Demonstrates custom blocks, commands, systems, and keybinds.
 */
export const TntPlugin: EditorPlugin = {
  name: 'tnt',
  components: [Tnt, Rock],
  systems: [explodeSystem],
  keybinds,
}

import type { Vec2 } from '@woven-canvas/math'
import { Synced } from '@woven-ecs/canvas-store'
import { addComponent, type Context, createEntity, type EntityId } from '@woven-ecs/core'
import { PlaceBlockEvent } from '../commands/containment'
import { Block } from '../components/Block'
import { RankBounds } from '../singletons/RankBounds'
import type { ResizeMode } from '../types'

/**
 * Input for {@link createBlock}: the `Block` component's fields. Only `tag` and
 * `position` are required — everything else defaults. `position` (the block's
 * top-left, in world coordinates) doubles as the point used to find the frame to
 * drop the block into. `rank` (z-order) is set to top-of-stack unless you provide
 * one.
 */
export interface CreateBlockInput {
  /** Block type, e.g. `'shape'` or your own `blockDefs` tag. */
  tag: string
  /** Top-left in world coordinates. Also the point used to find the target frame. */
  position: Vec2
  /** Width/height. Defaults to `[100, 100]`. */
  size?: Vec2
  /** Rotation around center, in radians. */
  rotateZ?: number
  /** Flip state `[flipX, flipY]`. */
  flip?: [boolean, boolean]
  /** How the block can be resized. */
  resizeMode?: ResizeMode
  /** Parent it yourself instead of letting `position` pick the frame. */
  parentId?: EntityId | null
  /** Layer membership. Usually left to plugins (e.g. a paged-document layer system). */
  layerId?: EntityId | null
  /** Override the z-order rank. Defaults to top-of-stack. */
  rank?: string
}

/**
 * Create a block entity and place it into the document in one call — the
 * recommended way for a plugin to spawn a block from a system.
 *
 * It handles the boilerplate that's easy to forget: assigns a `Synced` id (so the
 * block persists and syncs in multiplayer), gives it a top-of-stack `rank`
 * (z-order), adds the `Block` component, and dispatches {@link PlaceBlockEvent} — which
 * parents the block to the frame under its `position` and lets other plugins
 * attach per-block state (e.g. layer membership). Returns the new entity id so you
 * can add more components or select it.
 *
 * ```ts
 * const id = createBlock(ctx, { tag: 'potion-card', position: point, size: [200, 120] })
 * addComponent(ctx, id, Potion, { name: 'Health' })
 * ```
 *
 * For full control — a placement point different from the block's top-left, or
 * custom creation logic — build the entity yourself and dispatch `PlaceBlockEvent`
 * directly.
 */
export function createBlock(ctx: Context, block: CreateBlockInput): EntityId {
  const entityId = createEntity(ctx)
  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
  addComponent(ctx, entityId, Block, { ...block, rank: block.rank ?? RankBounds.genNext(ctx) })
  PlaceBlockEvent.spawn(ctx, { entityId })
  return entityId
}

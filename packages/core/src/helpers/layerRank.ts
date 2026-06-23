import { type Context, type EntityId, hasComponent } from '@woven-ecs/core'
import { Block } from '../components/Block'
import { Layer } from '../components/Layer'

/**
 * Resolve a block's layer rank: read the block's own `layerId` and return that
 * layer's rank — or `''` if the block is unlayered or its `layerId` is dangling.
 *
 * Layer membership is carried by every block directly (no inheritance walk): a
 * frame and its children each get their own `layerId`. A block with a null
 * `layerId` is genuinely unlayered.
 *
 * Shared by core hit-testing (`intersect`) and the DOM sort (`@woven-canvas/vue`,
 * which has `ctx` in its tick) so both stack content by layer identically. The
 * Rust renderer resolves the same field.
 */
export function resolveLayerRank(ctx: Context, entityId: EntityId): string {
  if (!hasComponent(ctx, entityId, Block)) return ''
  const layerId = Block.read(ctx, entityId).layerId
  if (layerId !== null && hasComponent(ctx, layerId, Layer)) {
    return Layer.read(ctx, layerId).rank
  }
  return ''
}

/**
 * Whether a block's layer permits interaction. A `hidden` or `locked` layer is
 * skipped by hit-testing, so its blocks are neither hovered nor selectable.
 * Unlayered blocks (null/dangling `layerId`) are always interactive.
 */
export function isLayerInteractive(ctx: Context, layerId: EntityId | null): boolean {
  if (layerId === null || !hasComponent(ctx, layerId, Layer)) return true
  const layer = Layer.read(ctx, layerId)
  return !layer.hidden && !layer.locked
}

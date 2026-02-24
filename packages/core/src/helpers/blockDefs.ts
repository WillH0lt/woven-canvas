import { type Context, type EntityId, getResources } from '@woven-ecs/core'

import { Block } from '../components/Block'
import { BlockDef, type EditorResources, ResizeMode } from '../types'

/**
 * Get all block definitions from the editor resources.
 *
 * @param ctx - The ECS context
 * @returns Map of block tag to normalized block definition
 */
export function getBlockDefs(ctx: Context): Record<string, BlockDef> {
  const { editor } = getResources<EditorResources>(ctx)
  return editor.blockDefs
}

/**
 * Get a block definition by tag.
 * Returns a default definition if the tag is not registered.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to look up
 * @returns Normalized block definition
 */
export function getBlockDef(ctx: Context, tag: string): BlockDef {
  const blockDefs = getBlockDefs(ctx)
  return blockDefs[tag] ?? BlockDef.parse({ tag })
}

/**
 * Check if a block definition allows editing.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be edited
 */
export function canBlockEdit(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).editOptions.canEdit
}

/**
 * Check if a block definition allows rotation.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be rotated
 */
export function canBlockRotate(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).canRotate
}

/**
 * Check if a block definition allows scaling.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be scaled
 */
export function canBlockScale(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).canScale
}

/**
 * Get the effective resize mode for a block entity.
 * Returns the block's resizeMode if set, otherwise falls back to blockDef's resizeMode.
 *
 * @param ctx - The ECS context
 * @param entityId - The block entity ID
 * @returns The effective resize mode ('scale', 'text', 'free', or 'groupOnly')
 */
export function getBlockResizeMode(ctx: Context, entityId: EntityId): ResizeMode {
  const block = Block.read(ctx, entityId)
  if (block.resizeMode !== ResizeMode.Default) {
    return block.resizeMode
  }
  const blockDef = getBlockDef(ctx, block.tag)
  return blockDef.resizeMode
}

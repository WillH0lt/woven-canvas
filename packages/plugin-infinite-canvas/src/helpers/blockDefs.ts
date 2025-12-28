import { type Context, getPluginResources } from "@infinitecanvas/editor";

import type { InfiniteCanvasResources } from "../Plugin";
import { BlockDef, type BlockDefMap } from "../types";

/**
 * Get all block definitions from the plugin resources.
 *
 * @param ctx - The ECS context
 * @returns Map of block tag to normalized block definition
 */
export function getBlockDefs(ctx: Context): BlockDefMap {
  const resources = getPluginResources<InfiniteCanvasResources>(
    ctx,
    "infiniteCanvas"
  );
  return resources.blockDefs;
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
  const blockDefs = getBlockDefs(ctx);
  return blockDefs[tag] ?? BlockDef.parse({ tag });
}

/**
 * Check if a block definition allows editing.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be edited
 */
export function canBlockEdit(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).editOptions.canEdit;
}

/**
 * Check if a block definition allows rotation.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be rotated
 */
export function canBlockRotate(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).canRotate;
}

/**
 * Check if a block definition allows scaling.
 *
 * @param ctx - The ECS context
 * @param tag - The block tag to check
 * @returns True if the block can be scaled
 */
export function canBlockScale(ctx: Context, tag: string): boolean {
  return getBlockDef(ctx, tag).canScale;
}

import {
  addComponent,
  hasComponent,
  getPluginResources,
  defineQuery,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Block, Selected } from "../components";
import type { InfiniteCanvasResources } from "../InfiniteCanvasPlugin";

// Query for selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected));

/**
 * Add Selected component to an entity with the current session's ID.
 * Does nothing if the entity already has the Selected component.
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to select
 */
export function selectBlock(ctx: Context, entityId: EntityId): void {
  if (hasComponent(ctx, entityId, Selected)) return;

  const { sessionId } = getPluginResources<InfiniteCanvasResources>(
    ctx,
    "infiniteCanvas"
  );
  addComponent(ctx, entityId, Selected, { selectedBy: sessionId });
}

/**
 * Get all blocks selected by the current session.
 * Filters out blocks selected by other users in collaborative environments.
 *
 * @param ctx - The ECS context
 * @returns Array of entity IDs selected by the current session
 */
export function getLocalSelectedBlocks(ctx: Context): EntityId[] {
  const { sessionId } = getPluginResources<InfiniteCanvasResources>(
    ctx,
    "infiniteCanvas"
  );

  const result: EntityId[] = [];
  for (const entityId of selectedBlocksQuery.current(ctx)) {
    const selected = Selected.read(ctx, entityId);
    if (selected.selectedBy === sessionId) {
      result.push(entityId);
    }
  }
  return result;
}

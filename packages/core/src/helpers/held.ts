import { type Context, type EntityId, getResources, hasComponent } from '@woven-ecs/core'
import { Held } from '../components/Held'
import type { EditorResources } from '../types'

/**
 * Check if a block is held by a remote user (not the current session).
 *
 * @param ctx - The ECS context
 * @param entityId - The entity to check
 * @returns True if the block is held by another user
 */
export function isHeldByRemote(ctx: Context, entityId: EntityId): boolean {
  if (!hasComponent(ctx, entityId, Held)) return false

  const { sessionId } = getResources<EditorResources>(ctx)
  const held = Held.read(ctx, entityId)
  return held.sessionId !== '' && held.sessionId !== sessionId
}

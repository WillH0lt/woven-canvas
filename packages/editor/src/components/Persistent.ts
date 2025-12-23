import { field } from "@infinitecanvas/ecs";
import { EditorComponentDef } from "../EditorComponentDef";

/**
 * Persistent marks an entity for persistence and sync.
 *
 * Only entities with this component will have their events sent to the StoreAdapter.
 * The `id` field stores the entity's stable UUID used for storage and sync.
 *
 * @example
 * ```typescript
 * import { createEntity, addComponent } from "@infinitecanvas/ecs";
 * import { Persistent } from "@infinitecanvas/editor";
 *
 * // Create a persistent entity
 * const entityId = createEntity(ctx);
 * addComponent(ctx, entityId, Persistent, {
 *   id: crypto.randomUUID(),
 * });
 *
 * // MyComponent changes will now be synced to the store
 * ```
 */
export const Persistent = new EditorComponentDef(
  "persistent",
  {
    /** The entity's stable UUID for storage and sync */
    id: field.string().max(36),
  },
  { sync: "document" }
);

import {
  defineEditorSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  getResources,
  on,
  Synced,
  Camera,
  Connector,
  getBackrefs,
  ComponentDef,
  type Context,
  type EditorResources,
  type EntityId,
  Aabb,
  Block,
  RankBounds,
  Cursor,
  Held,
} from "@infinitecanvas/editor";

import { Aabb as AabbNs, Vec2 } from "@infinitecanvas/math";
import {
  SelectBlock,
  DeselectBlock,
  ToggleSelect,
  DeselectAll,
  SelectAll,
  RemoveBlock,
  RemoveSelected,
  DragBlock,
  BringForwardSelected,
  SendBackwardSelected,
  SetCursor,
  Cut,
  Copy,
  Paste,
  CloneEntities,
  UncloneEntities,
  AddHeld,
  RemoveHeld,
} from "../../commands";
import { Selected } from "../../components";
import { Clipboard } from "../../singletons";
import type { ClipboardEntityData } from "../../singletons/Clipboard";
import {
  generateUuidBySeed,
  selectBlock,
  deselectBlock,
  convertRefsToUuids,
  getRefFieldNames,
  resolveRefFields,
} from "../../helpers";

// Query for locally selected blocks
const selectedBlocksQuery = defineQuery((q) => q.with(Block, Selected));

// Query for synced blocks
const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced));

/**
 * Block update system - handles block manipulation commands.
 *
 * Processes:
 * - SelectBlock, DeselectBlock, ToggleSelect, DeselectAll, SelectAll
 * - RemoveBlock, RemoveSelected
 * - DragBlock
 * - BringForwardSelected, SendBackwardSelected
 * - SetCursor
 * - Cut, Copy, Paste
 */
export const blockSystem = defineEditorSystem(
  { phase: "update" },
  (ctx: Context) => {
    on(ctx, DragBlock, (ctx, { entityId, position }) => {
      if (!hasComponent(ctx, entityId, Block)) return;
      const block = Block.write(ctx, entityId);
      block.position = position;
    });

    on(ctx, SelectBlock, (ctx, { entityId, deselectOthers }) => {
      if (deselectOthers) {
        deselectAllBlocks(ctx);
      }
      selectBlock(ctx, entityId);
    });

    on(ctx, DeselectBlock, (ctx, { entityId }) => {
      deselectBlock(ctx, entityId);
    });

    on(ctx, ToggleSelect, (ctx, { entityId }) => {
      if (hasComponent(ctx, entityId, Selected)) {
        deselectBlock(ctx, entityId);
      } else {
        selectBlock(ctx, entityId);
      }
    });

    on(ctx, DeselectAll, deselectAllBlocks);

    on(ctx, AddHeld, (ctx, { entityId }) => {
      if (!hasComponent(ctx, entityId, Synced)) return;
      if (hasComponent(ctx, entityId, Held)) return;

      const { sessionId } = getResources<EditorResources>(ctx);
      addComponent(ctx, entityId, Held, { sessionId });
    });

    on(ctx, RemoveHeld, (ctx, { entityId }) => {
      // Only remove Held if not selected (selected blocks should keep Held)
      if (hasComponent(ctx, entityId, Selected)) return;
      if (!hasComponent(ctx, entityId, Held)) return;

      removeComponent(ctx, entityId, Held);
    });

    on(ctx, SelectAll, (ctx) => {
      for (const entityId of syncedBlocksQuery.current(ctx)) {
        selectBlock(ctx, entityId);
      }
    });

    on(ctx, RemoveBlock, (ctx, { entityId }) => {
      removeEntity(ctx, entityId);
    });

    on(ctx, RemoveSelected, (ctx) => {
      for (const entityId of selectedBlocksQuery.current(ctx)) {
        removeEntity(ctx, entityId);
      }
    });

    on(ctx, BringForwardSelected, bringForwardSelected);
    on(ctx, SendBackwardSelected, sendBackwardSelected);

    on(ctx, SetCursor, (ctx, payload) => {
      if (payload.cursorKind !== undefined) {
        Cursor.setCursor(ctx, payload.cursorKind, payload.rotation ?? 0);
      }
      if (payload.contextCursorKind !== undefined) {
        Cursor.setContextCursor(
          ctx,
          payload.contextCursorKind,
          payload.contextRotation ?? 0,
        );
      }
      // Allow clearing context cursor by passing empty string
      if (payload.contextCursorKind === "") {
        Cursor.clearContextCursor(ctx);
      }
    });

    on(ctx, Copy, (ctx) => {
      copySelectedBlocks(ctx);
    });

    on(ctx, Cut, (ctx) => {
      copySelectedBlocks(ctx);
      // Remove selected blocks after copying
      for (const entityId of selectedBlocksQuery.current(ctx)) {
        removeEntity(ctx, entityId);
      }
    });

    on(ctx, Paste, (ctx, payload) => {
      pasteBlocks(ctx, payload?.position);
    });

    on(ctx, CloneEntities, (ctx, { entityIds, offset, seed }) => {
      cloneEntities(ctx, entityIds, offset, seed);
    });

    on(ctx, UncloneEntities, (ctx, { entityIds, seed }) => {
      uncloneEntities(ctx, entityIds, seed);
    });
  },
);

/**
 * Deselect all blocks selected by the current session.
 */
function deselectAllBlocks(ctx: Context): void {
  for (const entityId of selectedBlocksQuery.current(ctx)) {
    deselectBlock(ctx, entityId);
  }
}

/**
 * Bring selected blocks to front (generate new ranks).
 * Only affects blocks selected by the current session.
 */
function bringForwardSelected(ctx: Context): void {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)];
  if (selectedBlocks.length === 0) return;

  // Sort by current rank (ascending)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a);
    const blockB = Block.read(ctx, b);
    if (!blockA.rank && !blockB.rank) return 0;
    if (!blockA.rank) return -1;
    if (!blockB.rank) return 1;
    if (blockA.rank < blockB.rank) return -1;
    if (blockA.rank > blockB.rank) return 1;
    return 0;
  });

  // Assign new ranks at the front
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId);
    block.rank = RankBounds.genNext(ctx);
  }
}

/**
 * Send selected blocks to back (generate new ranks).
 * Only affects blocks selected by the current session.
 */
function sendBackwardSelected(ctx: Context): void {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)];
  if (selectedBlocks.length === 0) return;

  // Sort by current rank (descending - process highest rank first)
  selectedBlocks.sort((a, b) => {
    const blockA = Block.read(ctx, a);
    const blockB = Block.read(ctx, b);
    if (!blockA.rank && !blockB.rank) return 0;
    if (!blockA.rank) return 1;
    if (!blockB.rank) return -1;
    if (blockB.rank < blockA.rank) return -1;
    if (blockB.rank > blockA.rank) return 1;
    return 0;
  });

  // Assign new ranks at the back
  for (const entityId of selectedBlocks) {
    const block = Block.write(ctx, entityId);
    block.rank = RankBounds.genPrev(ctx);
  }
}

/**
 * Copy selected blocks to clipboard.
 * Serializes all document-synced components for each selected entity.
 * Ref fields are serialized as UUIDs (Synced.id) instead of EntityIds.
 * Only copies blocks selected by the current session.
 */
function copySelectedBlocks(ctx: Context): void {
  const selectedBlocks = [...selectedBlocksQuery.current(ctx)];
  if (selectedBlocks.length === 0) return;

  const { componentsById } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...componentsById].filter(([, def]) => def.sync === "document"),
  );

  const clipboardEntities: ClipboardEntityData[] = [];

  // Compute union of all selected block AABBs
  const unionAabb = AabbNs.zero();
  let hasAabb = false;

  const syncedComponentId = Synced._getComponentId(ctx);

  // Serialize each selected entity
  for (const entityId of selectedBlocks) {
    const entityData: ClipboardEntityData = new Map();

    // Always include Synced component (even though sync: "none") for UUID mapping
    if (hasComponent(ctx, entityId, Synced)) {
      entityData.set(syncedComponentId, Synced.snapshot(ctx, entityId));
    }

    // Iterate through entity's components and serialize document-synced ones
    for (const componentId of ctx.entityBuffer.getComponentIds(entityId)) {
      // Skip Synced - already handled above
      if (componentId === syncedComponentId) continue;

      const componentDef = documentComponents.get(componentId);
      if (componentDef) {
        const snapshot = componentDef.snapshot(ctx, entityId);

        // Convert ref fields from EntityId to UUID
        const converted = convertRefsToUuids(
          ctx,
          componentDef.schema,
          snapshot,
        );
        entityData.set(componentId, converted);
      }
    }

    clipboardEntities.push(entityData);

    // Track bounding box for center calculation
    if (hasComponent(ctx, entityId, Aabb)) {
      const { value } = Aabb.read(ctx, entityId);
      if (!hasAabb) {
        AabbNs.copy(unionAabb, value);
        hasAabb = true;
      } else {
        AabbNs.union(unionAabb, value);
      }
    }
  }

  // Store in clipboard
  Clipboard.setEntities(ctx, clipboardEntities);
  const clipboard = Clipboard.write(ctx);
  clipboard.count = clipboardEntities.length;
  clipboard.center = AabbNs.center(unionAabb);
}

/**
 * Paste entities from clipboard.
 * Restores all document-synced components for each entity.
 * Ref fields (stored as UUIDs) are resolved to pasted EntityIds,
 * or set to null if the referenced block wasn't copied.
 * @param position - Optional position to paste at. If not provided, pastes at screen center.
 */
function pasteBlocks(ctx: Context, position?: Vec2): void {
  const clipboardEntities = Clipboard.getEntities(ctx);
  if (clipboardEntities.length === 0) return;

  const { componentsById } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...componentsById].filter(([, def]) => def.sync === "document"),
  );

  const clipboard = Clipboard.read(ctx);
  const syncedComponentId = Synced._getComponentId(ctx);
  const blockComponentId = Block._getComponentId(ctx);

  // Calculate paste offset
  let offset: Vec2;
  if (position) {
    // Paste centered at the given position
    offset = Vec2.clone(position);
    Vec2.sub(offset, clipboard.center);
  } else {
    // Paste centered at the screen center
    const screenCenter = Camera.getWorldCenter(ctx);
    offset = Vec2.clone(screenCenter);
    Vec2.sub(offset, clipboard.center);
  }

  // Sort clipboard entities by rank to maintain relative z-order
  const sortedEntities = [...clipboardEntities].sort((a, b) => {
    const blockDataA = a.get(blockComponentId) as { rank?: string } | undefined;
    const blockDataB = b.get(blockComponentId) as { rank?: string } | undefined;
    const rankA = blockDataA?.rank ?? "";
    const rankB = blockDataB?.rank ?? "";
    if (rankA < rankB) return -1;
    if (rankA > rankB) return 1;
    return 0;
  });

  // Deselect current selection
  deselectAllBlocks(ctx);

  // Maps original Synced.id (UUID) -> new pasted EntityId
  const uuidToNewEntityId = new Map<string, EntityId>();

  // Track components with ref fields for deferred resolution
  const pendingRefs: Array<{
    entityId: EntityId;
    componentDef: ComponentDef<any>;
    componentData: Record<string, unknown>;
  }> = [];

  // First pass: create new entities from clipboard data
  for (const entityData of sortedEntities) {
    const entityId = createEntity(ctx);

    // Get original Synced.id from clipboard and map to new EntityId
    const syncedData = entityData.get(syncedComponentId) as
      | { id: string }
      | undefined;
    if (syncedData?.id) {
      uuidToNewEntityId.set(syncedData.id, entityId);
    }

    // Add Synced component with new UUID
    addComponent(ctx, entityId, Synced, {
      id: crypto.randomUUID(),
    });

    // Add all other components from clipboard
    for (const [componentId, componentData] of entityData) {
      // Skip synced - we already added it with a new ID
      if (componentId === syncedComponentId) continue;

      const componentDef = documentComponents.get(componentId);
      if (!componentDef) continue;

      // Clone the data to avoid mutating clipboard
      const data = { ...(componentData as Record<string, unknown>) };

      // Special handling for Block component: apply offset and new rank
      if (componentId === blockComponentId) {
        const pos = Vec2.clone(data.position as Vec2);
        Vec2.add(pos, offset);
        data.position = pos;
        data.rank = RankBounds.genNext(ctx);
      }

      // Check if component has ref fields - defer resolution
      const refFields = getRefFieldNames(componentDef.schema);
      if (refFields.length > 0) {
        // Remove ref fields - they default to null, we resolve them in second pass
        for (const fieldName of refFields) {
          delete data[fieldName];
        }
        pendingRefs.push({
          entityId,
          componentDef,
          componentData: componentData as Record<string, unknown>,
        });
      }

      addComponent(ctx, entityId, componentDef, data as any);
    }

    // Select the pasted entity
    selectBlock(ctx, entityId);
  }

  // Second pass: resolve ref fields from UUIDs to EntityIds
  for (const { entityId, componentDef, componentData } of pendingRefs) {
    resolveRefFields(
      ctx,
      entityId,
      componentDef,
      componentData,
      uuidToNewEntityId,
    );
  }
}

/**
 * Clone entities with deterministic UUIDs.
 * Creates clones at the original position (offset applied to originals during drag).
 */
function cloneEntities(
  ctx: Context,
  entityIds: EntityId[],
  offset: Vec2,
  seed: string,
): void {
  const { componentsById } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...componentsById].filter(([, def]) => def.sync === "document"),
  );
  const syncedComponentId = Synced._getComponentId(ctx);
  const blockComponentId = Block._getComponentId(ctx);

  // Build map during clone creation: original EntityId -> clone EntityId
  const originalToClone = new Map<EntityId, EntityId>();

  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue;

    const synced = Synced.read(ctx, entityId);
    const cloneId = generateUuidBySeed(synced.id, seed);

    // Create new entity for the clone
    const cloneEntityId = createEntity(ctx);
    originalToClone.set(entityId, cloneEntityId);

    // Add Synced with deterministic UUID
    addComponent(ctx, cloneEntityId, Synced, { id: cloneId });

    // Copy all document components
    for (const componentId of ctx.entityBuffer.getComponentIds(entityId)) {
      if (componentId === syncedComponentId) continue;

      const componentDef = documentComponents.get(componentId);
      if (!componentDef) continue;

      // Clone the data to avoid mutating original
      const data = {
        ...(componentDef.snapshot(ctx, entityId) as Record<string, unknown>),
      };

      // For Block component: apply offset and generate rank behind original
      if (componentId === blockComponentId) {
        const pos = Vec2.clone(data.position as Vec2);
        Vec2.add(pos, offset);
        data.position = pos;
        data.rank = RankBounds.genPrev(ctx);
      }

      addComponent(ctx, cloneEntityId, componentDef, data as any);
    }
  }

  // Swap connectors to point to clones (which stay in place)
  swapConnectorRefs(ctx, originalToClone);
}

/**
 * Remove cloned entities by regenerating their deterministic UUIDs.
 */
function uncloneEntities(
  ctx: Context,
  entityIds: EntityId[],
  seed: string,
): void {
  // Step 1: Calculate expected clone UUIDs
  const expectedCloneUuids = new Set<string>();
  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue;
    const synced = Synced.read(ctx, entityId);
    expectedCloneUuids.add(generateUuidBySeed(synced.id, seed));
  }

  // Step 2: Find clone entities
  const clonesToRemove: EntityId[] = [];
  for (const entityId of syncedBlocksQuery.current(ctx)) {
    const synced = Synced.read(ctx, entityId);
    if (expectedCloneUuids.has(synced.id)) {
      clonesToRemove.push(entityId);
    }
  }

  // Step 3: Build swap map (clone -> original) and swap connector refs
  const cloneToOriginal = new Map<EntityId, EntityId>();
  for (const cloneId of clonesToRemove) {
    const cloneUuid = Synced.read(ctx, cloneId).id;
    // Find the original that generated this clone
    for (const originalId of entityIds) {
      if (!hasComponent(ctx, originalId, Synced)) continue;
      const originalUuid = Synced.read(ctx, originalId).id;
      if (generateUuidBySeed(originalUuid, seed) === cloneUuid) {
        cloneToOriginal.set(cloneId, originalId);
        break;
      }
    }
  }
  swapConnectorRefs(ctx, cloneToOriginal);

  // Step 4: Remove clones
  for (const cloneId of clonesToRemove) {
    removeEntity(ctx, cloneId);
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
function swapConnectorRefs(
  ctx: Context,
  fromTo: Map<EntityId, EntityId>,
): void {
  for (const [fromId, toId] of fromTo) {
    // Find connectors where this entity is the startBlock
    for (const connectorId of getBackrefs(
      ctx,
      fromId,
      Connector,
      "startBlock",
    )) {
      Connector.write(ctx, connectorId).startBlock = toId;
    }

    // Find connectors where this entity is the endBlock
    for (const connectorId of getBackrefs(ctx, fromId, Connector, "endBlock")) {
      Connector.write(ctx, connectorId).endBlock = toId;
    }
  }
}

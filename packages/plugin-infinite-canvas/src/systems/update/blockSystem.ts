import {
  defineSystem,
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
  type Context,
  type EditorResources,
  type EntityId,
} from "@infinitecanvas/editor";

import { Aabb as AabbNs, Vec2 } from "@infinitecanvas/math";
import { Aabb, Block, Selected } from "../../components";
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
} from "../../commands";
import { RankBounds, Cursor, Clipboard } from "../../singletons";
import type { ClipboardEntityData } from "../../singletons/Clipboard";
import {
  generateUuidBySeed,
  selectBlock,
  getLocalSelectedBlocks,
} from "../../helpers";

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
export const blockSystem = defineSystem((ctx: Context) => {
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
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    }
  });

  on(ctx, ToggleSelect, (ctx, { entityId }) => {
    if (hasComponent(ctx, entityId, Selected)) {
      removeComponent(ctx, entityId, Selected);
    } else {
      selectBlock(ctx, entityId);
    }
  });

  on(ctx, DeselectAll, deselectAllBlocks);

  on(ctx, SelectAll, (ctx) => {
    for (const entityId of syncedBlocksQuery.current(ctx)) {
      selectBlock(ctx, entityId);
    }
  });

  on(ctx, RemoveBlock, (ctx, { entityId }) => {
    removeEntity(ctx, entityId);
  });

  on(ctx, RemoveSelected, (ctx) => {
    for (const entityId of getLocalSelectedBlocks(ctx)) {
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
        payload.contextRotation ?? 0
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
    for (const entityId of getLocalSelectedBlocks(ctx)) {
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
});

/**
 * Deselect all blocks selected by the current session.
 */
function deselectAllBlocks(ctx: Context): void {
  for (const entityId of getLocalSelectedBlocks(ctx)) {
    removeComponent(ctx, entityId, Selected);
  }
}

/**
 * Bring selected blocks to front (generate new ranks).
 * Only affects blocks selected by the current session.
 */
function bringForwardSelected(ctx: Context): void {
  const selectedBlocks = getLocalSelectedBlocks(ctx);
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
  const selectedBlocks = getLocalSelectedBlocks(ctx);
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
 * Only copies blocks selected by the current session.
 */
function copySelectedBlocks(ctx: Context): void {
  const selectedBlocks = getLocalSelectedBlocks(ctx);
  if (selectedBlocks.length === 0) return;

  const { editor } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...editor.components].filter(([, def]) => def.__editor.sync === "document")
  );

  const clipboardEntities: ClipboardEntityData[] = [];

  // Compute union of all selected block AABBs
  const unionAabb = AabbNs.zero();
  let hasAabb = false;

  // Serialize each selected entity
  for (const entityId of selectedBlocks) {
    const entityData: ClipboardEntityData = new Map();

    // Iterate through entity's components and serialize document-synced ones
    for (const componentId of ctx.entityBuffer.getComponentIds(entityId)) {
      const componentDef = documentComponents.get(componentId);
      if (componentDef) {
        entityData.set(componentId, componentDef.snapshot(ctx, entityId));
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
 * @param position - Optional position to paste at. If not provided, pastes at screen center.
 */
function pasteBlocks(ctx: Context, position?: Vec2): void {
  const clipboardEntities = Clipboard.getEntities(ctx);
  if (clipboardEntities.length === 0) return;

  const { editor } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...editor.components].filter(([, def]) => def.__editor.sync === "document")
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

  // Create new entities from clipboard data
  for (const entityData of sortedEntities) {
    const entityId = createEntity(ctx);

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

      addComponent(ctx, entityId, componentDef, data as any);
    }

    // Select the pasted entity
    selectBlock(ctx, entityId);
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
  seed: string
): void {
  const { editor } = getResources<EditorResources>(ctx);
  const documentComponents = new Map(
    [...editor.components].filter(([, def]) => def.__editor.sync === "document")
  );
  const syncedComponentId = Synced._getComponentId(ctx);
  const blockComponentId = Block._getComponentId(ctx);

  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue;

    const synced = Synced.read(ctx, entityId);
    const cloneId = generateUuidBySeed(synced.id, seed);

    // Create new entity for the clone
    const cloneEntityId = createEntity(ctx);

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
}

/**
 * Remove cloned entities by regenerating their deterministic UUIDs.
 */
function uncloneEntities(
  ctx: Context,
  entityIds: EntityId[],
  seed: string
): void {
  // Collect expected clone IDs first
  const expectedCloneIds = new Set<string>();
  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Synced)) continue;
    const synced = Synced.read(ctx, entityId);
    expectedCloneIds.add(generateUuidBySeed(synced.id, seed));
  }

  // Find and collect entities to remove (avoid modifying during iteration)
  const entitiesToRemove: EntityId[] = [];
  for (const candidateId of syncedBlocksQuery.current(ctx)) {
    const candidateSynced = Synced.read(ctx, candidateId);
    if (expectedCloneIds.has(candidateSynced.id)) {
      entitiesToRemove.push(candidateId);
    }
  }

  // Remove collected entities
  for (const entityId of entitiesToRemove) {
    removeEntity(ctx, entityId);
  }
}

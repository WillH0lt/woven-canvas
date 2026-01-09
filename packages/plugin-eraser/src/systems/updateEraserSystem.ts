import {
  defineEditorSystem,
  defineQuery,
  createEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  on,
  intersectCapsule,
  Synced,
  Aabb,
  Block,
  Opacity,
  type Context,
  type EntityId,
  getBackrefs,
} from "@infinitecanvas/editor";
import { Capsule } from "@infinitecanvas/math";

import {
  StartEraserStroke,
  AddEraserStrokePoint,
  CompleteEraserStroke,
  CancelEraserStroke,
} from "../commands";
import { EraserStroke, POINTS_CAPACITY, Erased } from "../components";
import { EraserStateSingleton } from "../singletons";
import { STROKE_RADIUS } from "../constants";

// Query for synced blocks with Aabb (for intersection testing)
const syncedBlocksQuery = defineQuery((q) => q.with(Block, Synced, Aabb));

// Query for erased entities
const erasedQuery = defineQuery((q) => q.with(Erased));

/**
 * Update eraser system - handles eraser commands and collision detection.
 *
 * Processes:
 * - StartEraserStroke: Create new stroke entity
 * - AddEraserStrokePoint: Add point to stroke, check for intersections
 * - CompleteEraserStroke: Delete all erased entities
 * - CancelEraserStroke: Restore all erased entities
 */
export const updateEraserSystem = defineEditorSystem(
  { phase: "update" },
  (ctx: Context) => {
    on(ctx, StartEraserStroke, (ctx, { worldPosition }) => {
      startStroke(ctx, worldPosition);
    });

    on(ctx, AddEraserStrokePoint, (ctx, { worldPosition }) => {
      addStrokePoint(ctx, worldPosition);
    });

    on(ctx, CompleteEraserStroke, (ctx, { strokeId }) => {
      completeStroke(ctx, strokeId);
    });

    on(ctx, CancelEraserStroke, (ctx, { strokeId }) => {
      cancelStroke(ctx, strokeId);
    });
  }
);

/**
 * Start a new eraser stroke at the given position.
 */
function startStroke(ctx: Context, position: [number, number]): void {
  // Create stroke entity
  const strokeId = createEntity(ctx);

  addComponent(ctx, strokeId, EraserStroke, {
    points: position,
    pointCount: 1,
    firstPointIndex: 0,
    radius: STROKE_RADIUS,
  });

  // Store reference to active stroke in state singleton
  const state = EraserStateSingleton.write(ctx);
  state.activeStroke = strokeId;
  state.lastWorldPosition = position;
}

/**
 * Add a point to the active eraser stroke and check for intersections.
 */
function addStrokePoint(ctx: Context, point: [number, number]): void {
  const state = EraserStateSingleton.read(ctx);
  const strokeId = state.activeStroke;

  if (strokeId === null) return;
  if (!hasComponent(ctx, strokeId, EraserStroke)) return;

  const stroke = EraserStroke.write(ctx, strokeId);

  // Get previous point for capsule creation
  const prevPointCount = stroke.pointCount;
  const prevIndex = ((prevPointCount - 1) % POINTS_CAPACITY) * 2;
  const prevX = stroke.points[prevIndex];
  const prevY = stroke.points[prevIndex + 1];

  // Add new point to circular buffer
  const nextIndex = (prevPointCount % POINTS_CAPACITY) * 2;
  stroke.points[nextIndex] = point[0];
  stroke.points[nextIndex + 1] = point[1];
  stroke.pointCount++;

  // Update first point index if we've exceeded capacity
  if (stroke.pointCount > POINTS_CAPACITY) {
    stroke.firstPointIndex =
      (stroke.pointCount - POINTS_CAPACITY) % POINTS_CAPACITY;
  }

  // Skip intersection check if the point hasn't moved much
  const dx = point[0] - prevX;
  const dy = point[1] - prevY;
  const distSq = dx * dx + dy * dy;
  if (distSq < 1) return; // Skip if less than 1 pixel movement

  // Create capsule from previous point to current point
  const capsule = Capsule.create(
    prevX,
    prevY,
    point[0],
    point[1],
    STROKE_RADIUS
  );

  // Find all blocks that intersect with the capsule (excluding already erased)
  const candidates = filterNotErased(ctx, syncedBlocksQuery.current(ctx));
  const hits = intersectCapsule(ctx, capsule, candidates);

  // Mark all intersecting blocks as erased
  for (const entityId of hits) {
    markAsErased(ctx, entityId, strokeId);
  }
}

/**
 * Filter out entities that are already marked as erased.
 */
function* filterNotErased(
  ctx: Context,
  entityIds: Iterable<EntityId>
): Iterable<EntityId> {
  for (const entityId of entityIds) {
    if (!hasComponent(ctx, entityId, Erased)) {
      yield entityId;
    }
  }
}

/**
 * Mark an entity as erased by the stroke.
 */
function markAsErased(
  ctx: Context,
  entityId: EntityId,
  strokeId: EntityId
): void {
  addComponent(ctx, entityId, Erased, {
    eraserStrokeId: strokeId,
  });

  addComponent(ctx, entityId, Opacity, {
    value: 80,
  });
}

/**
 * Complete the stroke - delete all erased entities.
 */
function completeStroke(ctx: Context, strokeId: EntityId): void {
  const erasedEntities = getBackrefs(ctx, strokeId, Erased, "eraserStrokeId");

  // Delete erased entities
  for (const entityId of erasedEntities) {
    removeEntity(ctx, entityId);
  }

  // Delete stroke entity
  removeEntity(ctx, strokeId);
}

/**
 * Cancel the stroke - restore all erased entities.
 */
function cancelStroke(ctx: Context, strokeId: EntityId): void {
  // Remove Erased component from all entities marked by this stroke
  const erasedEntities: EntityId[] = [];
  for (const entityId of erasedQuery.current(ctx)) {
    const erased = Erased.read(ctx, entityId);
    if (erased.eraserStrokeId === strokeId) {
      erasedEntities.push(entityId);
    }
  }

  for (const entityId of erasedEntities) {
    removeComponent(ctx, entityId, Erased);
    removeComponent(ctx, entityId, Opacity);
  }

  // Delete stroke entity
  removeEntity(ctx, strokeId);
}

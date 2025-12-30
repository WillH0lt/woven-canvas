import {
  defineSystem,
  defineQuery,
  addComponent,
  removeComponent,
  hasComponent,
  type Context,
} from "@infinitecanvas/ecs";

import { Block, Aabb, Hovered, Pointer } from "../../components";
import { Camera, Mouse, Controls } from "../../singletons";
import { Intersect } from "../../singletons";
import { intersectPoint } from "../../helpers";

// Query for blocks that have changed (need AABB recalculation)
const blocksChanged = defineQuery((q) => q.tracking(Block));

// Query for currently hovered entities
const hoveredQuery = defineQuery((q) => q.with(Hovered));

// Query for active pointers
const pointerQuery = defineQuery((q) => q.with(Pointer));

/**
 * Clear all Hovered components.
 */
function clearHovered(ctx: Context): void {
  for (const entityId of hoveredQuery.current(ctx)) {
    if (hasComponent(ctx, entityId, Hovered)) {
      removeComponent(ctx, entityId, Hovered);
    }
  }
}

/**
 * Update which entity has the Hovered component.
 */
function updateHovered(ctx: Context, newHoveredId: number | undefined): void {
  // Only show hover when select tool is active
  const controls = Controls.read(ctx);
  const selectToolActive = controls.leftMouseTool === "select";

  // Clear existing hovered entities
  clearHovered(ctx);

  // Add hovered to new entity if select tool is active
  if (newHoveredId !== undefined && selectToolActive) {
    if (!hasComponent(ctx, newHoveredId, Hovered)) {
      addComponent(ctx, newHoveredId, Hovered, {});
    }
  }
}

/**
 * Check if two arrays are equal.
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Pre-capture intersect system - computes AABBs and detects mouse-block intersections.
 *
 * Capture phase system that:
 * 1. Updates AABB for blocks that have changed
 * 2. Finds blocks under the mouse cursor
 * 3. Updates the Intersect singleton
 * 4. Manages Hovered component on blocks
 *
 * Note: For test isolation, use createIntersectSystem() instead to get a fresh instance.
 */
export const intersectSystem = defineSystem((ctx: Context) => {
  // Update AABBs for changed blocks
  const added = blocksChanged.added(ctx);
  const changed = blocksChanged.changed(ctx);

  for (const entityId of added) {
    // Ensure block has Aabb component
    if (!hasComponent(ctx, entityId, Aabb)) {
      addComponent(ctx, entityId, Aabb, { value: [0, 0, 0, 0] });
    }
    Aabb.computeFromBlock(ctx, entityId);
  }

  for (const entityId of changed) {
    Aabb.computeFromBlock(ctx, entityId);
  }

  // Check if we need to update intersections
  const mouseDidMove = Mouse.didMove(ctx);
  const mouseDidLeave = Mouse.didLeave(ctx);
  const mouseDidScroll = Mouse.didScroll(ctx);
  const blocksHaveChanged = added.length > 0 || changed.length > 0;

  // Only update if mouse moved, left, scrolled, or blocks changed
  if (
    !mouseDidMove &&
    !mouseDidLeave &&
    !mouseDidScroll &&
    !blocksHaveChanged
  ) {
    return;
  }

  // Handle mouse leave - clear all intersections and hover
  if (mouseDidLeave) {
    Intersect.clear(ctx);
    clearHovered(ctx);
    return;
  }

  // Get mouse position in world coordinates
  const mousePos = Mouse.getPosition(ctx);
  const worldPos = Camera.toWorld(ctx, mousePos);

  // Find intersected blocks (sorted by z-order, topmost first)
  const intersected = intersectPoint(ctx, worldPos);

  // Check if intersections changed
  const prevIntersected = Intersect.getAll(ctx);
  if (arraysEqual(intersected, prevIntersected)) {
    return;
  }

  // Update Intersect singleton
  Intersect.setAll(ctx, intersected);

  // Don't change hover state while pointer is down
  // This prevents flickering when dragging objects
  const pointers = pointerQuery.current(ctx);
  if (pointers.length > 0) {
    return;
  }

  // Update hovered entity
  updateHovered(ctx, intersected[0]);
});

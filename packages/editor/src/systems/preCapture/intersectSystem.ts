import {
  defineQuery,
  addComponent,
  removeComponent,
  hasComponent,
  type Context,
} from "@infinitecanvas/ecs";

import { defineEditorSystem } from "../../EditorSystem";
import { Camera, Mouse, Controls, Intersect } from "../../singletons";
import { Pointer, Block, Aabb, Hovered, HitGeometry } from "../../components";
import { computeAabb, intersectPoint } from "../../helpers";

// Query for blocks that have changed (need AABB recalculation)
const blocksChanged = defineQuery((q) => q.tracking(Block));

const hitGeometryChanged = defineQuery((q) => q.tracking(HitGeometry));

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

const added = new Set<number>();
const changed = new Set<number>();

/**
 * Pre-capture intersect system - computes AABBs and detects mouse-block intersections.
 *
 * Runs early in the capture phase (priority: 100) to:
 * 1. Update AABB for blocks that have changed
 * 2. Find blocks under the mouse cursor
 * 3. Update the Intersect singleton
 * 4. Manage Hovered component on blocks
 *
 * Note: For test isolation, use createIntersectSystem() instead to get a fresh instance.
 */
export const intersectSystem = defineEditorSystem(
  { phase: "capture", priority: 100 },
  (ctx: Context) => {
    // Update AABBs for changed blocks
    added.clear();
    for (const entityId of blocksChanged.added(ctx)) {
      added.add(entityId);
    }
    for (const entityId of hitGeometryChanged.added(ctx)) {
      added.add(entityId);
    }

    changed.clear();
    for (const entityId of blocksChanged.changed(ctx)) {
      changed.add(entityId);
    }
    for (const entityId of hitGeometryChanged.changed(ctx)) {
      changed.add(entityId);
    }

    for (const entityId of added) {
      // Ensure block has Aabb component
      if (!hasComponent(ctx, entityId, Aabb)) {
        addComponent(ctx, entityId, Aabb, { value: [0, 0, 0, 0] });
      }

      const aabb = Aabb.write(ctx, entityId);
      computeAabb(ctx, entityId, aabb.value);
    }

    for (const entityId of changed) {
      const aabb = Aabb.write(ctx, entityId);
      computeAabb(ctx, entityId, aabb.value);
    }

    // Check if we need to update intersections
    const mouseDidMove = Mouse.didMove(ctx);
    const mouseDidLeave = Mouse.didLeave(ctx);
    const mouseDidScroll = Mouse.didScroll(ctx);
    const blocksHaveChanged = added.size > 0 || changed.size > 0;

    // Only update if mouse moved, left, scrolled, or blocks/hit geometries changed
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
  }
);

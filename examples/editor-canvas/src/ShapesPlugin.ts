import {
  field,
  defineEditorComponent,
  defineEditorSingleton,
  defineSystem,
  defineQuery,
  getPointerInput,
  createEntity,
  addComponent,
  Storable,
  type EditorPlugin,
  type Context,
  type EntityId,
} from "@infinitecanvas/editor";
import { Vec2 } from "@infinitecanvas/math";

/**
 * Shape component - represents a draggable rectangle on the canvas.
 *
 * This is a simple example of a user-defined component that stores
 * position, size, and color data for each shape entity.
 */
export const Shape = defineEditorComponent(
  "shapes",
  {
    /** World position (center of shape) [x, y] */
    position: field.tuple(field.float64(), 2).default([0, 0]),
    /** Size of the rectangle [width, height] */
    size: field.tuple(field.float64(), 2).default([50, 50]),
    /** Color as a hex string (e.g., "#ff0000") */
    color: field.string().max(16).default("#0f3460"),
  },
  { sync: "document" }
);

/** Query for all entities with Shape component */
export const shapeQuery = defineQuery((q) => q.with(Shape));

/**
 * DragState singleton - tracks the current drag operation.
 * Using a singleton ensures proper ECS integration and supports multiple editor instances.
 */
export const DragState = defineEditorSingleton(
  "dragState",
  {
    /** Whether a drag is currently active */
    active: field.boolean().default(false),
    /** Entity ID of the shape being dragged */
    entityId: field.uint32().default(0),
    /** Offset from shape center to click position [x, y] */
    offset: field.tuple(field.float64(), 2).default([0, 0]),
  },
  { sync: "none" }
);

// Temp vectors for calculations
const _halfSize: Vec2 = [0, 0];
const _tempPos: Vec2 = [0, 0];

/**
 * Hit test to find which shape (if any) is under the given world position.
 * Returns the topmost (last created) shape that contains the point.
 */
function hitTestShape(ctx: Context, worldPos: Vec2): EntityId | null {
  let hitEntity: EntityId | null = null;

  // Iterate all shapes and find the one under the cursor
  // Later entities are "on top" so we want the last match
  for (const eid of shapeQuery.current(ctx)) {
    const shape = Shape.read(ctx, eid);
    Vec2.copy(_halfSize, shape.size as Vec2);
    Vec2.scale(_halfSize, 0.5);

    if (
      worldPos[0] >= shape.position[0] - _halfSize[0] &&
      worldPos[0] <= shape.position[0] + _halfSize[0] &&
      worldPos[1] >= shape.position[1] - _halfSize[1] &&
      worldPos[1] <= shape.position[1] + _halfSize[1]
    ) {
      hitEntity = eid;
    }
  }

  return hitEntity;
}

/**
 * System that handles dragging shapes with the mouse.
 *
 * This demonstrates:
 * - Using getPointerInput() to get high-level pointer events
 * - Hit testing against shape bounds
 * - Updating component data based on user input
 * - Using a singleton to track drag state
 */
const shapeDragSystem = defineSystem((ctx: Context) => {
  // Get left-click pointer events
  const events = getPointerInput(ctx, ["left"]);

  for (const event of events) {
    if (event.type === "pointerDown") {
      // Check if we clicked on a shape
      const hitEntity = hitTestShape(ctx, event.worldPosition);

      if (hitEntity !== null) {
        const shape = Shape.read(ctx, hitEntity);
        // Store the offset from shape center to click position
        const drag = DragState.write(ctx);
        drag.active = true;
        drag.entityId = hitEntity;
        // offset = position - worldPosition
        Vec2.copy(drag.offset as Vec2, shape.position as Vec2);
        Vec2.sub(drag.offset as Vec2, event.worldPosition);
      }
    } else if (event.type === "pointerMove") {
      const drag = DragState.read(ctx);
      if (drag.active) {
        // Move the shape to follow the cursor
        const shape = Shape.write(ctx, drag.entityId);
        // position = worldPosition + offset
        Vec2.copy(_tempPos, event.worldPosition);
        Vec2.add(_tempPos, drag.offset as Vec2);
        Vec2.copy(shape.position as Vec2, _tempPos);
      }
    } else if (event.type === "pointerUp" || event.type === "cancel") {
      // End the drag
      const drag = DragState.write(ctx);
      drag.active = false;
    }
  }
});

/**
 * Helper function to create a new shape entity.
 *
 * @param ctx - ECS context
 * @param x - World X position
 * @param y - World Y position
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param color - Fill color (hex string)
 * @returns The entity ID of the created shape
 */
export function createShape(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): EntityId {
  const entityId = createEntity(ctx);
  addComponent(ctx, entityId, Storable, {
    id: crypto.randomUUID(),
  });
  addComponent(ctx, entityId, Shape, {
    position: [x, y],
    size: [width, height],
    color,
  });
  return entityId;
}

/**
 * ShapesPlugin - A simple plugin demonstrating user-defined components.
 *
 * This plugin provides:
 * - Shape component for storing rectangle data
 * - Drag system for moving shapes with the mouse
 * - createShape() helper for spawning new shapes
 *
 * Usage:
 * ```typescript
 * import { ShapesPlugin, createShape, Shape } from './ShapesPlugin';
 *
 * const editor = new Editor(container, {
 *   plugins: [ShapesPlugin],
 * });
 *
 * await editor.initialize();
 * const ctx = editor._getContext();
 *
 * // Create some shapes
 * createShape(ctx, 100, 100, 60, 60, '#e94560');
 *
 * // In your render loop, iterate shapes:
 * for (const entity of Shape.query(ctx)) {
 *   const shape = Shape.read(ctx, entity.eid);
 *   // Draw shape at (shape.x, shape.y) with shape.width, shape.height
 * }
 * ```
 */
export const ShapesPlugin: EditorPlugin = {
  name: "shapes",
  components: [Shape],
  singletons: [DragState],
  captureSystems: [shapeDragSystem],
};

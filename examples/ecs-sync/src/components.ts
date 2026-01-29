import { defineSingleton, field } from "@infinitecanvas/ecs";
import { defineEditorComponent, Synced } from "@infinitecanvas/ecs-sync";

// Re-export Synced for convenience
export { Synced };

// Synced sphere component - positions are persisted and synced
export const Sphere = defineEditorComponent(
  { name: "sphere", sync: "document" },
  {
    x: field.float32(),
    y: field.float32(),
    z: field.float32(),
    radius: field.float32().default(0.5),
    color: field.uint32().default(0x4488ff),
  },
);

// Local-only components for interaction state
export const Hovered = defineEditorComponent({ name: "hovered" }, {});
export const Selected = defineEditorComponent({ name: "selected" }, {});
export const Dragging = defineEditorComponent({ name: "dragging" }, {});

// Singletons for input state
export const Mouse = defineSingleton({
  x: field.float32(),
  y: field.float32(),
  down: field.uint8(), // 0 = up, 1 = down
});

export const Time = defineSingleton({
  delta: field.float32(),
  current: field.float32(),
});

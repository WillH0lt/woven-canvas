import { field, defineComponent } from "@infinitecanvas/ecs";

export const Velocity = defineComponent("Velocity", {
  x: field.float32(),
  y: field.float32(),
});

export const Position = defineComponent("Position", {
  x: field.float32(),
  y: field.float32(),
});

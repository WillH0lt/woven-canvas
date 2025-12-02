import { field, defineComponent } from "@infinitecanvas/ecs";

const Velocity = defineComponent("Velocity", {
  x: field.float32(),
  y: field.float32(),
});

export { Velocity };

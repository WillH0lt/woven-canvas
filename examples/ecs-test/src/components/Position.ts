import { field, defineComponent } from "@infinitecanvas/ecs";

const Position = defineComponent("Position", {
  x: field.float32(),
  y: field.float32(),
});

export { Position };

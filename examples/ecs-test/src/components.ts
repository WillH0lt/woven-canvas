import { field, defineComponent } from "@infinitecanvas/ecs";

export const Velocity = defineComponent({
  x: field.float32(),
  y: field.float32(),
});

export const Position = defineComponent({
  x: field.float32(),
  y: field.float32(),
  pts: field.array(field.float32(), 1024),
});

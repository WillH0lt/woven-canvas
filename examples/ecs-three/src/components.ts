import { defineComponent, defineSingleton, field } from "@infinitecanvas/ecs";

export const Position = defineComponent({
  x: field.float32().default(0),
  y: field.float32().default(0),
  z: field.float32().default(0),
});

export const Velocity = defineComponent({
  x: field.float32().default(0),
  y: field.float32().default(0),
  z: field.float32().default(0),
});

export const Acceleration = defineComponent({
  x: field.float32().default(0),
  y: field.float32().default(0),
  z: field.float32().default(0),
});

export const Color = defineComponent({
  r: field.float32().default(1),
  g: field.float32().default(1),
  b: field.float32().default(1),
});

export const Lifetime = defineComponent({
  current: field.float32().default(0),
  max: field.float32().default(5),
});

export const Size = defineComponent({
  value: field.float32().default(0.1),
});

export const Attractor = defineComponent({
  strength: field.float32().default(2),
  targetX: field.float32().default(0),
  targetY: field.float32().default(0),
  targetZ: field.float32().default(0),
});

export const Mouse = defineSingleton({
  x: field.float32().default(0),
  y: field.float32().default(0),
});

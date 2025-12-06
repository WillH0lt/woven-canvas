import { field, defineComponent, defineSingleton } from "@infinitecanvas/ecs";

export const Velocity = defineComponent("Velocity", {
  x: field.float32(),
  y: field.float32(),
});

export const Position = defineComponent("Position", {
  x: field.float32(),
  y: field.float32(),
});

export const MouseSingleton = defineSingleton("Mouse", {
  x: field.float32().default(10),
  y: field.float32().default(100),
});

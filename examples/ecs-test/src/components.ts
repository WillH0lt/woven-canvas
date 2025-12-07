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

export const Size = defineComponent("Size", {
  width: field.float32().default(50),
  height: field.float32().default(50),
});

export const Color = defineComponent("Color", {
  red: field.uint8().default(255),
  green: field.uint8().default(0),
  blue: field.uint8().default(0),
});

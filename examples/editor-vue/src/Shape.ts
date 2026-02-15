import { defineCanvasComponent, field } from "@infinitecanvas/editor";

// Define the Rect component schema
export const Shape = defineCanvasComponent(
  { name: "shape", sync: "document" },
  {
    border: field.uint16().default(5),
  },
);

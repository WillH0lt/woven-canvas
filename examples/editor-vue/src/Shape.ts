import { defineEditorComponent, field } from "@infinitecanvas/editor";

// Define the Rect component schema
export const Shape = defineEditorComponent(
  { name: "shape", sync: "document" },
  {
    border: field.uint16().default(5),
  },
);

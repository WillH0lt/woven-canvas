import { defineEditorComponent, field } from "@infinitecanvas/editor";

// Define the Rect component schema
export const Shape = defineEditorComponent(
  "shape",
  {
    border: field.uint16().default(5)
  },
  { sync: "document" }
);

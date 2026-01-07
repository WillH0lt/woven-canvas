import { defineEditorComponent, field } from "@infinitecanvas/editor";

// Define the Rect component schema
export const Shape = defineEditorComponent(
  "shape",
  {
    color: field.uint32().default(0x4a90d9ff),
  },
  { sync: "document" }
);

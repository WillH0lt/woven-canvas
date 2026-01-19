import { field } from "@infinitecanvas/ecs";
import { defineEditorComponent } from "../EditorComponentDef";
import { VerticalAlignment } from "../types";

/**
 * VerticalAlign component - controls vertical text alignment within a block.
 *
 * Values: "top", "center", "bottom"
 */
export const VerticalAlign = defineEditorComponent(
  "verticalAlign",
  {
    value: field.enum(VerticalAlignment).default(VerticalAlignment.Top),
  },
  { sync: "document" },
);

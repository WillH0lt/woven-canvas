import { field, defineEditorComponent } from "@infinitecanvas/editor";

import { TransformHandleKind } from "../types";
import { CursorKind } from "../cursors";

/**
 * TransformHandle component - marks an entity as a transform handle.
 *
 * Transform handles are the draggable points around a transform box
 * that allow scaling, stretching, or rotating the selection.
 *
 * - `kind`: The type of transformation (scale, stretch, rotate)
 * - `vector`: Direction vector [-1,0,1] for x and y indicating handle position
 * - `transformBox`: Entity ID of the parent transform box
 * - `cursorKind`: Cursor to show when hovering this handle
 */
export const TransformHandle = defineEditorComponent(
  "transformHandle",
  {
    kind: field.string().max(16).default(TransformHandleKind.Scale),
    vectorX: field.int8().default(0),
    vectorY: field.int8().default(0),
    transformBox: field.ref(),
    cursorKind: field.string().max(16).default(CursorKind.Drag),
  },
  { sync: "none" }
);

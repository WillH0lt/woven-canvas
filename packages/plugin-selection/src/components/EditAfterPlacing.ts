import { defineCanvasComponent } from "@infinitecanvas/core";

/**
 * EditAfterPlacing component - marker for blocks that should enter edit mode after placement.
 *
 * This is a one-shot marker added by blockPlacementSystem when creating editable blocks.
 * The capture transformBoxSystem checks for this component on selectionChanged and
 * transitions to Editing state if present, then removes the component.
 */
export const EditAfterPlacing = defineCanvasComponent(
  { name: "editAfterPlacing" },
  {}
);

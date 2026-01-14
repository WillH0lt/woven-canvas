import { field, defineEditorState } from "@infinitecanvas/editor";
import { TransformBoxState } from "../types";

/**
 * Transform box state singleton - stores the current state of the transform box state machine.
 */
export const TransformBoxStateSingleton = defineEditorState("transformBoxState", {
  state: field.string().max(32).default(TransformBoxState.None),
});

import { defineEditorComponent, field } from "@infinitecanvas/editor";

/**
 * Persistent component - marks blocks that should persist to storage.
 *
 * Blocks with this component are saved to the document store.
 * Transient entities (like the transform box) should not have this component.
 */
export const Persistent = defineEditorComponent(
  "persistent",
  {
    /** UUID for stable persistence across sessions */
    uuid: field.string().max(36).default(""),
  },
  { sync: "document" }
);

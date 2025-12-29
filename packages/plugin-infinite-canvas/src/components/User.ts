import { field, defineEditorComponent } from "@infinitecanvas/editor";

/**
 * User component - tracks user presence on the canvas.
 *
 * Used to show who is currently viewing the document.
 * The id field is always defined - if not provided, a crypto UUID is generated.
 */
export const User = defineEditorComponent(
  "user",
  {
    /** Unique user identifier (always defined) */
    id: field.string().max(64).default(""),
    /** Optional display name */
    name: field.string().max(128).default(""),
    /** Optional profile image URL */
    profileUrl: field.string().max(512).default(""),
  },
  { sync: "ephemeral" }
);

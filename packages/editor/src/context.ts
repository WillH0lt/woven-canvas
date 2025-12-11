import type { Context } from "@infinitecanvas/ecs";
import type { Editor } from "./Editor";

/**
 * Editor context extends ECS context with editor-specific data.
 *
 * This is passed to all systems and provides access to:
 * - ECS operations (createEntity, addComponent, etc.)
 * - Editor instance for commands and scheduling
 */
export interface EditorContext extends Context {
  /** The editor instance */
  editor: Editor;
}

/**
 * Create an editor context from an ECS context
 * @internal
 */
export function createEditorContext(ctx: Context, editor: Editor): EditorContext {
  return {
    ...ctx,
    editor,
  };
}

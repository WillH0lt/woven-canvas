import { ComponentDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorComponentOptions {
  /**
   * How this singleton syncs across clients
   * @default 'none'
   */
  sync?: SyncBehavior;
}

export class EditorComponentDef<
  T extends ComponentSchema
> extends ComponentDef<T> {
  readonly __editor: EditorComponentMeta;

  constructor(schema: T, options: EditorComponentOptions = {}) {
    super(schema, false);
    this.__editor = {
      sync: options.sync ?? "none",
    };
  }
}

export type AnyEditorComponentDef = EditorComponentDef<ComponentSchema>;

export function defineEditorComponent<T extends ComponentSchema>(
  schema: T,
  options: EditorComponentOptions = {}
): EditorComponentDef<T> {
  return new EditorComponentDef(schema, options);
}

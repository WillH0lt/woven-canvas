import { SingletonDef, type ComponentSchema } from "@infinitecanvas/ecs";
import type { SyncBehavior, EditorComponentMeta } from "./types";

export interface EditorSingletonOptions {
  /**
   * How this singleton syncs across clients
   * @default 'none'
   */
  sync?: SyncBehavior;
}

export class EditorSingletonDef<
  T extends ComponentSchema
> extends SingletonDef<T> {
  readonly __editor: EditorComponentMeta;

  constructor(schema: T, options: EditorSingletonOptions = {}) {
    super(schema);
    this.__editor = {
      sync: options.sync ?? "none",
    };
  }
}

export type AnyEditorSingletonDef = EditorSingletonDef<ComponentSchema>;

export function defineEditorSingleton<T extends ComponentSchema>(
  schema: T,
  options: EditorSingletonOptions = {}
): EditorSingletonDef<T> {
  return new EditorSingletonDef(schema, options);
}

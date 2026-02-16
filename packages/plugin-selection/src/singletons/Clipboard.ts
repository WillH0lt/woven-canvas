import type { Editor } from '@infinitecanvas/core'
import { CanvasSingletonDef, type Context, type EditorResources, field, getResources } from '@infinitecanvas/core'

/**
 * Serialized entity data for clipboard storage.
 * Maps component IDs to their serialized data.
 */
export type ClipboardEntityData = Map<number, unknown>

/**
 * Clipboard state stored in singleton.
 * The actual entity data is stored outside ECS since singletons
 * can't store complex nested objects.
 */
const ClipboardSchema = {
  /** Number of items in clipboard */
  count: field.uint32().default(0),
  /** Center of copied blocks (for paste offset) */
  center: field.tuple(field.float64(), 2).default([0, 0]),
}

/**
 * Per-world clipboard data storage.
 * Uses WeakMap keyed by Editor instance for world isolation.
 */
const clipboardStorage = new WeakMap<Editor, ClipboardEntityData[]>()

/**
 * Clipboard singleton - manages copy/paste state for entities.
 *
 * Stores serialized entity data as a map of component IDs to their data.
 * All components with sync="document" are automatically serialized.
 * Each Editor instance has its own isolated clipboard.
 */
class ClipboardDef extends CanvasSingletonDef<typeof ClipboardSchema> {
  constructor() {
    super({ name: 'clipboard' }, ClipboardSchema)
  }

  /**
   * Store entities in clipboard for this world.
   */
  setEntities(ctx: Context, entities: ClipboardEntityData[]): void {
    const { editor } = getResources<EditorResources>(ctx)
    clipboardStorage.set(editor, entities)
  }

  /**
   * Get entities from clipboard for this world.
   */
  getEntities(ctx: Context): ClipboardEntityData[] {
    const { editor } = getResources<EditorResources>(ctx)
    return clipboardStorage.get(editor) ?? []
  }

  /**
   * Clear the clipboard for this world.
   */
  clearEntities(ctx: Context): void {
    const { editor } = getResources<EditorResources>(ctx)
    clipboardStorage.delete(editor)
  }

  /**
   * Check if clipboard has content for this world.
   */
  hasContent(ctx: Context): boolean {
    const { editor } = getResources<EditorResources>(ctx)
    const data = clipboardStorage.get(editor)
    return data !== undefined && data.length > 0
  }
}

export const Clipboard = new ClipboardDef()

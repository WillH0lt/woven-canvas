import {
  defineEditorComponent,
  field,
  createEntity,
  addComponent,
  Block,
  Synced,
  type EditorPlugin,
  type Context,
  type EntityId,
  type InferComponentType,
} from "@infinitecanvas/editor";
import { useBlock } from "@infinitecanvas/vue";
import { generateKeyBetween } from "fractional-indexing-jittered";

// Define the Rect component schema
export const Rect = defineEditorComponent(
  "rect",
  {
    color: field.uint32().default(0x4a90d9ff),
  },
  { sync: "document" }
);

export type RectData = InferComponentType<typeof Rect.schema>;

// Plugin that registers the Rect component and block def
export const RectPlugin: EditorPlugin = {
  name: "rect",
  components: [Rect],
  blockDefs: [{ tag: "rect", components: [Rect] }],
};

/** Typed composable for rect blocks */
export const useRectBlock = (entityId: EntityId) =>
  useBlock(entityId, [Rect] as const);

// Helper to create rect blocks
export function createRectBlock(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = 0x4a90d9ff
): number {
  const entityId = createEntity(ctx);

  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
  addComponent(ctx, entityId, Block, {
    tag: "rect",
    position: [x, y],
    size: [width, height],
    rank: generateKeyBetween(null, null),
  });
  addComponent(ctx, entityId, Rect, { color });

  return entityId;
}

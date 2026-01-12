import {
  Block,
  Opacity,
  type EntityId,
  type InferComponentType,
} from "@infinitecanvas/editor";

import { Selected } from "@infinitecanvas/plugin-selection";

type BlockComponentData = InferComponentType<typeof Block.schema>;
type SelectedComponentData = InferComponentType<typeof Selected.schema>;
type OpacityComponentData = InferComponentType<typeof Opacity.schema>;

// Extended block data with state for rendering
export interface BlockData {
  entityId: EntityId;
  block: BlockComponentData;
  selected: SelectedComponentData | null;
  hovered: boolean;
  edited: boolean;
  opacity: OpacityComponentData | null;
}
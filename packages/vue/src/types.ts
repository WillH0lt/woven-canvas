import {
  Block,
  Opacity,
  Connector,
  type EntityId,
  type InferComponentType,
} from "@infinitecanvas/editor";

import { Held } from "@infinitecanvas/plugin-selection";

type BlockComponentData = InferComponentType<typeof Block.schema>;
type HeldComponentData = InferComponentType<typeof Held.schema>;
type OpacityComponentData = InferComponentType<typeof Opacity.schema>;
type ConnectorComponentData = InferComponentType<typeof Connector.schema>;

// Extended block data with state for rendering
export interface BlockData {
  entityId: EntityId;
  block: BlockComponentData;
  selected: boolean;
  held: HeldComponentData | null;
  hovered: boolean;
  edited: boolean;
  opacity: OpacityComponentData | null;
  connector: ConnectorComponentData | null;
}

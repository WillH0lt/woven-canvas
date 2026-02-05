import {
  Block,
  Opacity,
  Connector,
  Held,
  type EntityId,
  type InferEditorComponentType,
} from "@infinitecanvas/editor";

type BlockComponentData = InferEditorComponentType<typeof Block.schema>;
type HeldComponentData = InferEditorComponentType<typeof Held.schema>;
type OpacityComponentData = InferEditorComponentType<typeof Opacity.schema>;
type ConnectorComponentData = InferEditorComponentType<typeof Connector.schema>;

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

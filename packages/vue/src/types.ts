import {
  Block,
  Opacity,
  Connector,
  Held,
  type EntityId,
  type InferEditorComponentType,
  type Stratum,
} from "@infinitecanvas/editor";

type BlockComponentData = InferEditorComponentType<typeof Block.schema>;
type HeldComponentData = InferEditorComponentType<typeof Held.schema>;
type OpacityComponentData = InferEditorComponentType<typeof Opacity.schema>;
type ConnectorComponentData = InferEditorComponentType<typeof Connector.schema>;

// Extended block data with state for rendering
export interface BlockData {
  entityId: EntityId;
  block: BlockComponentData;
  stratum: Stratum;
  selected: boolean;
  held: HeldComponentData | null;
  hovered: boolean;
  edited: boolean;
  opacity: OpacityComponentData | null;
  connector: ConnectorComponentData | null;
}

// Background configuration options
export interface BackgroundOptions {
  /** Background type: 'grid', 'dots', or 'none' */
  kind: "grid" | "dots" | "none";
  /** Background fill color */
  color: string;
  /** Stroke color for grid lines or dots */
  strokeColor: string;
  /** Number of subdivisions for the pattern */
  subdivisionStep: number;
  /** Size of dots when kind is 'dots' (default: 2) */
  dotSize?: number;
  /** Width of grid lines when kind is 'grid' (default: 1) */
  gridSize?: number;
}

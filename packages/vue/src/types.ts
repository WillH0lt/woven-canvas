import type { Block, Connector, EntityId, Held, InferCanvasComponentType, Opacity, Stratum } from '@woven-canvas/core'

type BlockComponentData = InferCanvasComponentType<typeof Block.schema>
type HeldComponentData = InferCanvasComponentType<typeof Held.schema>
type OpacityComponentData = InferCanvasComponentType<typeof Opacity.schema>
type ConnectorComponentData = InferCanvasComponentType<typeof Connector.schema>

// Extended block data with state for rendering
export interface BlockData {
  entityId: EntityId
  block: BlockComponentData
  stratum: Stratum
  selected: boolean
  held: HeldComponentData | null
  hovered: boolean
  edited: boolean
  opacity: OpacityComponentData | null
  connector: ConnectorComponentData | null
}

// Background configuration options
export interface BackgroundOptions {
  /** Background type: 'grid', 'dots', or 'none' */
  kind: 'grid' | 'dots' | 'none'
  /** Background fill color */
  color: string
  /** Stroke color for grid lines or dots */
  strokeColor: string
  /** Number of subdivisions for the pattern */
  subdivisionStep: number
  /** Size of dots when kind is 'dots' (default: 2) */
  dotSize?: number
  /** Width of grid lines when kind is 'grid' (default: 1) */
  gridSize?: number
}

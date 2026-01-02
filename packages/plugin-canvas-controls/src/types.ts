/**
 * Options for the canvas controls plugin.
 */
export interface CanvasControlsOptions {
  /** Minimum zoom level (default: 0.05 = 5%) */
  minZoom: number;
  /** Maximum zoom level (default: 4 = 400%) */
  maxZoom: number;
}

/**
 * Default control options.
 */
export const DEFAULT_CONTROLS_OPTIONS: CanvasControlsOptions = {
  minZoom: 0.05,
  maxZoom: 4,
};

/**
 * Pan state machine states.
 */
export enum PanStateValue {
  Idle = "idle",
  Panning = "panning",
  Gliding = "gliding",
}

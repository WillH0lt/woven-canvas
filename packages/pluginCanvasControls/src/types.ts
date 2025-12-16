import type { EditorResources } from "@infinitecanvas/editor";

/**
 * Options for the controls plugin.
 */
export interface ControlsOptions {
  /** Minimum zoom level (default: 0.05 = 5%) */
  minZoom: number;
  /** Maximum zoom level (default: 4 = 400%) */
  maxZoom: number;
}

/**
 * Default control options.
 */
export const DEFAULT_CONTROLS_OPTIONS: ControlsOptions = {
  minZoom: 0.05,
  maxZoom: 4,
};

/**
 * Resources available to control systems.
 */
export type ControlsResources = EditorResources & ControlsOptions;

/**
 * Pan state machine states.
 */
export enum PanStateValue {
  Idle = "idle",
  Panning = "panning",
  Gliding = "gliding",
}

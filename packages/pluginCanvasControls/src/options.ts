import { DEFAULT_CONTROLS_OPTIONS, type ControlsOptions } from "./types";

/**
 * Module-scoped controls options.
 * Set by ControlsPlugin and read by systems.
 */
let controlsOptions: ControlsOptions = { ...DEFAULT_CONTROLS_OPTIONS };

/**
 * Set the controls options (called by ControlsPlugin setup).
 * @internal
 */
export function setControlsOptions(options: ControlsOptions): void {
  controlsOptions = options;
}

/**
 * Get the current controls options.
 * @internal
 */
export function getControlsOptions(): ControlsOptions {
  return controlsOptions;
}

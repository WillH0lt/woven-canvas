/**
 * State for selection state machine.
 */
export const SelectionState = {
  Idle: "idle",
  Pointing: "pointing",
  Dragging: "dragging",
  SelectionBoxPointing: "selectionBoxPointing",
  SelectionBoxDragging: "selectionBoxDragging",
} as const;

export type SelectionState =
  (typeof SelectionState)[keyof typeof SelectionState];

/**
 * State for transform box state machine.
 */
export const TransformBoxState = {
  None: "none",
  Idle: "idle",
  Editing: "editing",
} as const;

export type TransformBoxState =
  (typeof TransformBoxState)[keyof typeof TransformBoxState];

/**
 * Kind of transform handle (corner, edge, rotation).
 */
export const TransformHandleKind = {
  Scale: "scale",
  Stretch: "stretch",
  Rotate: "rotate",
} as const;

export type TransformHandleKind =
  (typeof TransformHandleKind)[keyof typeof TransformHandleKind];

import { z } from "zod";

/**
 * State for scroll edges state machine.
 */
export const ScrollEdgesState = {
  Idle: "idle",
  Waiting: "waiting",
  Scrolling: "scrolling",
} as const;

export type ScrollEdgesState =
  (typeof ScrollEdgesState)[keyof typeof ScrollEdgesState];

/**
 * Schema for edge scrolling options.
 */
export const EdgeScrollingOptionsSchema = z.object({
  /** Whether edge scrolling is enabled (default: true) */
  enabled: z.boolean().default(true),
  /** Size of the edge zone in pixels (default: 10) */
  edgeSizePx: z.number().default(10),
  /** Camera scroll speed in pixels per frame (default: 15) */
  edgeScrollSpeedPxPerFrame: z.number().default(15),
  /** Delay before scrolling starts in milliseconds (default: 250) */
  edgeScrollDelayMs: z.number().default(250),
});

/**
 * Schema for the selection plugin options.
 */
export const SelectionPluginOptionsSchema = z.object({
  /** Edge scrolling options */
  edgeScrolling: EdgeScrollingOptionsSchema.default(
    EdgeScrollingOptionsSchema.parse({}),
  ),
});

/**
 * Options for the selection plugin (with defaults applied).
 */
export type SelectionPluginOptions = z.output<
  typeof SelectionPluginOptionsSchema
>;

/**
 * Input options for the selection plugin (all fields optional).
 */
export type SelectionPluginOptionsInput = z.input<
  typeof SelectionPluginOptionsSchema
>;

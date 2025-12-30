import { defineCommand } from "../command";

/**
 * Add or update the transform box to wrap current selection.
 * Creates a new transform box if none exists, or updates bounds if selection changed.
 */
export const AddOrUpdateTransformBox = defineCommand<void>("add-or-update-transform-box");

/**
 * Update the transform box bounds to match current selection.
 */
export const UpdateTransformBox = defineCommand<void>("update-transform-box");

/**
 * Hide the transform box (keep entity, just make invisible).
 */
export const HideTransformBox = defineCommand<void>("hide-transform-box");

/**
 * Show the transform box (make visible again).
 */
export const ShowTransformBox = defineCommand<void>("show-transform-box");

/**
 * Remove the transform box entity entirely.
 */
export const RemoveTransformBox = defineCommand<void>("remove-transform-box");

/**
 * Enter edit mode for the transform box (e.g., editing text in a block).
 */
export const StartTransformBoxEdit = defineCommand<void>("start-transform-box-edit");

/**
 * Exit edit mode for the transform box.
 */
export const EndTransformBoxEdit = defineCommand<void>("end-transform-box-edit");

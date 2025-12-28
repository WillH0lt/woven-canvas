import {
  type Context,
  type EntityId,
  type PointerInput,
  type PointerButton,
  type PointerInputOptions,
  getPointerInput,
} from "@infinitecanvas/editor";

import { Intersect } from "../singletons";

/**
 * Extended pointer input with intersection data from the Intersect singleton.
 */
export interface PointerInputWithIntersects extends PointerInput {
  /** Entity IDs at the pointer position, sorted by z-order (topmost first) */
  intersects: EntityId[];
}

/**
 * Get pointer input events with intersection data included.
 *
 * This wraps `getPointerInput` from the editor package and adds the current
 * intersected entities from the Intersect singleton to each event.
 *
 * @param ctx - ECS context
 * @param buttons - Array of pointer buttons to filter for
 * @param options - Optional configuration (passed to getPointerInput)
 * @returns Array of pointer input events with intersects included
 */
export function getPointerInputWithIntersects(
  ctx: Context,
  buttons: PointerButton[],
  options?: PointerInputOptions
): PointerInputWithIntersects[] {
  const rawEvents = getPointerInput(ctx, buttons, options);
  const intersects = Intersect.getAll(ctx);

  return rawEvents.map((event) => ({
    ...event,
    intersects,
  }));
}

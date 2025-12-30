import type { Vec2 } from "@infinitecanvas/math";
import { defineCommand } from "../command";

/**
 * Cut selected blocks to clipboard and remove them.
 */
export const Cut = defineCommand<void>("cut");

/**
 * Copy selected blocks to clipboard.
 */
export const Copy = defineCommand<void>("copy");

/**
 * Paste blocks from clipboard.
 * @param position - Optional position to paste at. If not provided, pastes at offset from original.
 */
export const Paste = defineCommand<{
  position?: Vec2;
}>("paste");

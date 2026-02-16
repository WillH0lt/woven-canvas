import { field, type Context } from "@woven-ecs/core";
import { CanvasSingletonDef } from "@woven-ecs/canvas-store";
import { generateJitteredKeyBetween } from "fractional-indexing-jittered";

const RankBoundsSchema = {
  minRank: field.string().max(36).default(""),
  maxRank: field.string().max(36).default(""),
};

/**
 * RankBounds singleton - tracks the min and max z-order ranks in the document.
 *
 * Used to generate new ranks when creating blocks that should be
 * at the top or bottom of the z-order.
 */
class RankBoundsDef extends CanvasSingletonDef<typeof RankBoundsSchema> {
  constructor() {
    super({ name: "rankBounds" }, RankBoundsSchema);
  }

  /**
   * Generate the next rank (higher z-order than all existing).
   * @returns A new rank string that sorts after maxRank
   */
  genNext(ctx: Context): string {
    const bounds = this.write(ctx);

    // Generate key after current max (or first key if empty)
    const next = generateJitteredKeyBetween(bounds.maxRank || null, null);
    bounds.maxRank = next;

    // If this is the first key, also set minRank
    if (!bounds.minRank) {
      bounds.minRank = next;
    }

    return next;
  }

  /**
   * Generate the previous rank (lower z-order than all existing).
   * @returns A new rank string that sorts before minRank
   */
  genPrev(ctx: Context): string {
    const bounds = this.write(ctx);

    // Generate key before current min (or first key if empty)
    const prev = generateJitteredKeyBetween(null, bounds.minRank || null);
    bounds.minRank = prev;

    // If this is the first key, also set maxRank
    if (!bounds.maxRank) {
      bounds.maxRank = prev;
    }

    return prev;
  }

  /**
   * Generate a rank between two existing ranks.
   * @param before - Rank to come after (or null for start)
   * @param after - Rank to come before (or null for end)
   * @returns A new rank string that sorts between the two
   */
  genBetween(before: string | null, after: string | null): string {
    return generateJitteredKeyBetween(before, after);
  }

  /**
   * Add a rank to tracking (expands bounds if needed).
   */
  add(ctx: Context, rank: string): void {
    if (!rank) return;

    const bounds = this.write(ctx);

    if (!bounds.minRank || rank < bounds.minRank) {
      bounds.minRank = rank;
    }

    if (!bounds.maxRank || rank > bounds.maxRank) {
      bounds.maxRank = rank;
    }
  }
}

export const RankBounds = new RankBoundsDef();

import type { Patch, ComponentData } from "./types";
import { isEqual } from "./utils";

/**
 * Merge multiple mutations into a single mutation.
 * Later mutations override earlier ones for the same key.
 * For component data, fields are merged (later values override earlier).
 *
 * @example
 * merge(
 *   { "e1/Position": { x: 10 } },
 *   { "e1/Position": { y: 20 } }
 * )
 * // Returns: { "e1/Position": { x: 10, y: 20 } }
 *
 * @example
 * merge(
 *   { "e1/Position": { x: 10 } },
 *   { "e1/Position": null }
 * )
 * // Returns: { "e1/Position": null }
 */
export function merge(...mutations: Patch[]): Patch {
  const result: Patch = {};

  for (const mutation of mutations) {
    for (const [key, value] of Object.entries(mutation)) {
      const existing = result[key];

      if (value === null) {
        // Deletion overrides everything
        result[key] = null;
      } else if (existing === null || existing === undefined) {
        // New value or replacing a deletion
        result[key] = { ...value };
      } else {
        // Merge component data fields
        result[key] = { ...existing, ...value };
      }
    }
  }

  return result;
}

/**
 * Subtract mutation `b` from mutation `a`, removing redundant updates.
 * Returns a new mutation containing only the changes in `a` that differ from `b`.
 *
 * Use case: When comparing local changes against already-synced state,
 * subtract removes fields that have already been applied.
 *
 * @example
 * subtract(
 *   { "e1/Position": { x: 10, y: 20 } },
 *   { "e1/Position": { x: 10 } }
 * )
 * // Returns: { "e1/Position": { y: 20 } }
 *
 * @example
 * subtract(
 *   { "e1/Position": { x: 10 }, "e2/Velocity": { vx: 5 } },
 *   { "e1/Position": { x: 10 } }
 * )
 * // Returns: { "e2/Velocity": { vx: 5 } }
 */
export function subtract(a: Patch, b: Patch): Patch {
  const result: Patch = {};

  for (const [key, aValue] of Object.entries(a)) {
    const bValue = b[key];

    if (aValue === null) {
      // Deletion in a
      if (bValue !== null) {
        // b doesn't have the deletion, keep it
        result[key] = null;
      }
      // If b also has null, it's redundant - skip
      continue;
    }

    if (bValue === null || bValue === undefined) {
      // a has data but b doesn't or b deletes - keep all of a's data
      result[key] = { ...aValue };
      continue;
    }

    // Both have component data - compare fields
    const diff = subtractComponentData(aValue, bValue);
    if (diff !== null) {
      result[key] = diff;
    }
  }

  return result;
}

/**
 * Subtract component data b from a, returning only differing fields.
 * Returns null if all fields are redundant (equal).
 */
function subtractComponentData(
  a: ComponentData,
  b: ComponentData,
): ComponentData | null {
  const result: ComponentData = {};
  let hasChanges = false;

  for (const [field, aFieldValue] of Object.entries(a)) {
    const bFieldValue = b[field];

    if (!isEqual(aFieldValue, bFieldValue)) {
      result[field] = aFieldValue;
      hasChanges = true;
    }
  }

  return hasChanges ? result : null;
}

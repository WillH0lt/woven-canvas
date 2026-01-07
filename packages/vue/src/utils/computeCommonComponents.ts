import type { Editor } from "@infinitecanvas/editor";

/**
 * Compute the set of component names that are common to all selected blocks.
 *
 * Looks up each block's tag in editor.blockDefs to get its component list,
 * then intersects across all blocks to find shared components.
 *
 * @param editor - The editor instance
 * @param selectedBlocks - Array of selected blocks with their tags
 * @returns Set of component names common to all selected blocks
 */
export function computeCommonComponents(
  editor: Editor,
  selectedBlocks: Array<{ tag: string }>
): Set<string> {
  if (selectedBlocks.length === 0) return new Set();

  // Get components for first block
  const firstTag = selectedBlocks[0].tag;
  const firstDef = editor.blockDefs[firstTag];
  if (!firstDef) return new Set();

  const common = new Set(firstDef.components.map((c) => c.name));

  // Intersect with remaining blocks
  for (let i = 1; i < selectedBlocks.length; i++) {
    const tag = selectedBlocks[i].tag;
    const def = editor.blockDefs[tag];
    if (!def) {
      common.clear();
      break;
    }

    const componentNames = new Set(def.components.map((c) => c.name));
    for (const name of common) {
      if (!componentNames.has(name)) {
        common.delete(name);
      }
    }
  }

  return common;
}

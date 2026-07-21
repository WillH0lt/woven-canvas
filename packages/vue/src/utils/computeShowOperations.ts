import type { Editor } from '@woven-canvas/core'

/**
 * Compute whether the floating menu should show the block operations (…)
 * button for the current selection.
 *
 * The button is shown only when every selected block's def has
 * `showOperations` enabled. Unregistered tags fall back to `true`,
 * matching the `BlockDef` schema default in core.
 *
 * @param editor - The editor instance
 * @param selectedBlocks - Array of selected blocks with their tags
 * @returns True if the block operations button should be shown
 */
export function computeShowOperations(editor: Editor, selectedBlocks: Array<{ tag: string }>): boolean {
  if (selectedBlocks.length === 0) return false

  return selectedBlocks.every(({ tag }) => editor.blockDefs[tag]?.showOperations ?? true)
}

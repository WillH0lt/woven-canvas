---
"@woven-canvas/core": patch
"@woven-canvas/vue": minor
---

Add a block operations (…) button to the floating menu with duplicate, bring forward, send backward, and delete actions

- New `showOperations` block def option (default `true`) shows the button on the right side of the floating menu; set it to `false` on a block def to opt out. The button is hidden when any selected block opts out.
- The `DuplicateSelected` command now has a handler: it clones the selection in place (clones keep connector attachments) and offsets the still-selected originals by one grid cell.
- Fixed a latent double-offset bug in clone handling: when a selection contained both a parent and its child, the child's clone was offset twice (its position is parent-relative). Clone offsets now apply only to roots of the cloned set, via the new `filterRoots` helper.
- New `BlockOperationsButton` component exported from `@woven-canvas/vue`; override it via the `button:operations` slot on `FloatingMenuBar`

---
"@woven-canvas/vue": minor
---

Images can now have their aspect ratio unlocked. Selecting an image reveals an aspect lock toggle in the floating menu (`AspectLockButton`, overridable via the `button:image` slot). Unlocking sets `resizeMode` to `ResizeMode.Free` on the block, which swaps its scale handles for stretch handles so width and height drag independently; locking clears the override so the block follows its block def again. The state lives on the block, so it persists and syncs.

`MenuButton` now keeps its tooltip in sync when its `title` changes while the pointer is still over it. The text was previously captured on mouseenter, so a button that relabelled itself on click kept showing the old label until the pointer left and came back.

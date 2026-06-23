---
"@woven-canvas/core": patch
"@woven-canvas/plugin-pen": patch
"@woven-canvas/vue": patch
---

Add a Layer z-order system (named layers with per-layer rank, lock, and hide folded into the shared block sort and hit-testing), configurable per-canvas text editing options (`textOptions` prop to toggle links and underline) with creation defaults, and reject non-finite pen stroke samples so strokes no longer spring a stray vertex at the world origin on reload.

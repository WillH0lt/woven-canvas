---
"@woven-canvas/plugin-canvas-controls": minor
"@woven-canvas/core": minor
---

Shift + scroll now pans the canvas horizontally. The Shift flag from wheel events is exposed as `wheelShiftKey` on the Mouse singleton and `MouseInput`, and the scroll system maps a vertical wheel delta onto the horizontal axis while it is held. Browsers that already report shift+wheel as `deltaX` (macOS, Firefox) are left untouched.

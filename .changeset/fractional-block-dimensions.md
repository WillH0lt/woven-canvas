---
"@woven-canvas/vue": patch
---

Fix text blocks creeping by a fraction of a pixel every time formatting (highlight, bold, italic, marks) was applied to a selected block. `computeBlockDimensions` mixed a sub-pixel rect center with integer `offsetWidth`/`offsetHeight`; it now uses the fractional computed size.

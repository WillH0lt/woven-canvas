---
"@woven-canvas/core": patch
"@woven-canvas/plugin-canvas-controls": patch
---

Add spacebar pan: hold the space bar to pan with a left mouse button drag

- New `spaceLeftMouseTool` controls option (default `'hand'`) remaps the left mouse button while space is held; set it to an empty string to disable the remap
- Releasing space mid-drag ends the pan immediately and restores the left mouse button to its normal tool

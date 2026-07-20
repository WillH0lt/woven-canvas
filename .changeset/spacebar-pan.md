---
"@woven-canvas/core": minor
"@woven-canvas/plugin-canvas-controls": minor
---

Add spacebar pan: hold the space bar to pan with a left mouse button drag

- New `spaceLeftMouseTool` controls option (default `'hand'`) remaps the left mouse button while space is held; set it to an empty string to disable the remap
- Releasing space mid-drag keeps the pan active until the mouse button is released

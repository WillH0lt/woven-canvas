# @woven-canvas/plugin-canvas-controls

## 2.0.0

### Patch Changes

- Updated dependencies [f411c0b]
  - @woven-canvas/core@1.1.0

## 1.0.8

### Patch Changes

- 8b03d32: Fix Space-bar tool handoffs so an active marquee selection is cleared and an active pan ends cleanly.
- d4f0351: Add spacebar pan: hold the space bar to pan with a left mouse button drag
  - New `spaceLeftMouseTool` controls option (default `'hand'`) remaps the left mouse button while space is held; set it to an empty string to disable the remap
  - Releasing space mid-drag ends the pan immediately and restores the left mouse button to its normal tool

- Updated dependencies [8b03d32]
- Updated dependencies [d4f0351]
  - @woven-canvas/core@1.0.15

## 1.0.7

### Patch Changes

- daa8a29: Fix keyboard and trackpad input on Mac and Windows
  - Bind Backspace to RemoveSelected so the Mac delete key removes selected blocks
  - Handle macOS suppressing keyup events while Cmd is held: repeated shortcuts (e.g. Cmd+Z, Cmd+Z) now fire every time, and keys no longer get stuck down after a Cmd combo
  - Capture the Ctrl/Cmd flag from wheel events (`wheelModKey` on the Mouse singleton and `MouseInput`), so trackpad pinch gestures zoom instead of scrolling and mod+scroll zooms even when the canvas isn't focused
  - Normalize zoom sensitivity across input devices: per-event wheel delta is clamped so trackpad pinches (tiny, frequent deltas) zoom ~10x more than before, while mouse wheel notches feel the same

- Updated dependencies [daa8a29]
  - @woven-canvas/core@1.0.14

## 1.0.6

### Patch Changes

- 38f8455: Added frames
- Updated dependencies [38f8455]
- Updated dependencies [5f5300f]
  - @woven-canvas/core@1.0.5

## 1.0.5

### Patch Changes

- 0b828ff: fix changesets release
- Updated dependencies [0b828ff]
  - @woven-canvas/core@1.0.4
  - @woven-canvas/math@1.0.3

## 1.0.4

### Patch Changes

- 3fb7ea6: syncing versions
- Updated dependencies [3fb7ea6]
  - @woven-canvas/core@1.0.3
  - @woven-canvas/math@1.0.2

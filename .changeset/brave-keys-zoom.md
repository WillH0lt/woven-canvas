---
"@woven-canvas/core": patch
"@woven-canvas/plugin-canvas-controls": patch
---

Fix keyboard and trackpad input on Mac and Windows

- Bind Backspace to RemoveSelected so the Mac delete key removes selected blocks
- Handle macOS suppressing keyup events while Cmd is held: repeated shortcuts (e.g. Cmd+Z, Cmd+Z) now fire every time, and keys no longer get stuck down after a Cmd combo
- Capture the Ctrl/Cmd flag from wheel events (`wheelModKey` on the Mouse singleton and `MouseInput`), so trackpad pinch gestures zoom instead of scrolling and mod+scroll zooms even when the canvas isn't focused
- Normalize zoom sensitivity across input devices: per-event wheel delta is clamped so trackpad pinches (tiny, frequent deltas) zoom ~10x more than before, while mouse wheel notches feel the same

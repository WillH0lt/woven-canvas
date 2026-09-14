---
"@woven-canvas/core": patch
"@woven-canvas/plugin-canvas-controls": patch
---

Add arrow-key nudging for selections and smooth camera movement when nothing is selected. Support diagonal movement, grid-sized selection steps, larger Shift steps, and immediate direction changes while holding multiple arrows. Keep nudge behavior in the controls plugin, using shared keyboard input with editable-field protection and optional native repeat events.

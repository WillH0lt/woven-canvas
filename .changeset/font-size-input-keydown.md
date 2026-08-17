---
"@woven-canvas/vue": patch
---

Fix the custom font-size box in the text menu destroying the text it was meant to resize. Its keystrokes reached the canvas keybinds, so Backspace — editing `24` down to `2` on the way to `28` — fired `RemoveSelected` and deleted the selected block; the dropdown now stops keydown propagation like the link input does. The box also applied the font on every keystroke, so that same `2` briefly set a 2px font; it now commits once on Enter or blur, and an unusable entry reverts to the applied size.

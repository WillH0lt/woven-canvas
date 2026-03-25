---
"@woven-canvas/plugin-selection": patch
"@woven-canvas/vue": patch
---

Improved text handling

- Added `useClipboard` composable to handle clipboard operations for the canvas.
- Implemented serialization and deserialization of selected blocks for clipboard use.
- Introduced `useKeyboardAvoidance` to manage camera position when the mobile keyboard opens.
- Created `DoubleClickState` singleton to track double-click actions and manage block placement.
- Added `doubleClickCreateSystem` to place blocks on double-click events.
- Enhanced text handling with `plainTextToHtml` utility for converting plain text to HTML.
- Updated various components to use consistent single quotes for string literals.
- Refactored existing code for improved readability and maintainability.

# @woven-canvas/plugin-selection

## 1.0.5

### Patch Changes

- ba61fc2: Improved text handling
  - Added `useClipboard` composable to handle clipboard operations for the canvas.
  - Implemented serialization and deserialization of selected blocks for clipboard use.
  - Introduced `useKeyboardAvoidance` to manage camera position when the mobile keyboard opens.
  - Created `DoubleClickState` singleton to track double-click actions and manage block placement.
  - Added `doubleClickCreateSystem` to place blocks on double-click events.
  - Enhanced text handling with `plainTextToHtml` utility for converting plain text to HTML.
  - Updated various components to use consistent single quotes for string literals.
  - Refactored existing code for improved readability and maintainability.

## 1.0.4

### Patch Changes

- 0b828ff: fix changesets release
- Updated dependencies [0b828ff]
  - @woven-canvas/core@1.0.4
  - @woven-canvas/math@1.0.3

## 1.0.3

### Patch Changes

- 3fb7ea6: syncing versions
- Updated dependencies [3fb7ea6]
  - @woven-canvas/core@1.0.3
  - @woven-canvas/math@1.0.2

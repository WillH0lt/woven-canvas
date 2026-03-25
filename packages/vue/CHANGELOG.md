# @woven-canvas/vue

## 1.0.10

### Patch Changes

- ec755ea: initialize default font

## 1.0.9

### Patch Changes

- 9021855: track default font

## 1.0.8

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

- Updated dependencies [ba61fc2]
  - @woven-canvas/plugin-selection@1.0.5

## 1.0.7

### Patch Changes

- 0b828ff: fix changesets release
- Updated dependencies [0b828ff]
  - @woven-canvas/asset-sync@1.0.4
  - @woven-canvas/core@1.0.4
  - @woven-canvas/math@1.0.3
  - @woven-canvas/plugin-arrows@1.0.4
  - @woven-canvas/plugin-canvas-controls@1.0.5
  - @woven-canvas/plugin-eraser@1.0.3
  - @woven-canvas/plugin-pen@1.0.3
  - @woven-canvas/plugin-selection@1.0.4
  - @woven-canvas/plugin-tapes@1.0.3

## 1.0.6

### Patch Changes

- 3fb7ea6: syncing versions
- Updated dependencies [3fb7ea6]
  - @woven-canvas/plugin-canvas-controls@1.0.4
  - @woven-canvas/asset-sync@1.0.3
  - @woven-canvas/core@1.0.3
  - @woven-canvas/math@1.0.2
  - @woven-canvas/plugin-arrows@1.0.3
  - @woven-canvas/plugin-eraser@1.0.2
  - @woven-canvas/plugin-pen@1.0.2
  - @woven-canvas/plugin-selection@1.0.3
  - @woven-canvas/plugin-tapes@1.0.2

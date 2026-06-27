# @woven-canvas/vue

## 1.0.16

### Patch Changes

- 6f5d755: Update `@woven-ecs/canvas-store` to ^1.2.0
- d8ea969: Resume pending asset uploads when connectivity is regained, not just on the next load. `AssetManager.resumePendingUploads()` is now idempotent (skips in-flight uploads, reuses existing blob URLs) and resets each job's retry budget, and `WovenCanvas` calls it whenever it transitions back online. So an image queued while offline — or one that exhausted its retries during a long outage — uploads as soon as there's a connection instead of waiting for a reload.
- Updated dependencies [6f5d755]
- Updated dependencies [d8ea969]
  - @woven-canvas/core@1.0.10
  - @woven-canvas/asset-sync@1.0.8

## 1.0.15

### Patch Changes

- e7bc435: Add a `createBlock` core helper and `PlaceBlockEvent` command so plugins can spawn and place a block in one call — core parents it to the frame under its position, and other plugins (e.g. a paged-document layer system) can react to attach per-block state. Built-in placement systems and the pen plugin now route through it. Asset resolution gains a `ResolveDimensions` argument on `AssetProvider.resolveUrl`/`AssetManager.getDisplayUrl` so resizing CDN providers can return an appropriately sized variant, with image and tape blocks requesting device-pixel render sizes that only ever grow.
- Updated dependencies [e7bc435]
- Updated dependencies [561a703]
  - @woven-canvas/asset-sync@1.0.7
  - @woven-canvas/core@1.0.9
  - @woven-canvas/plugin-pen@1.0.7

## 1.0.14

### Patch Changes

- 566fba4: Add a Layer z-order system (named layers with per-layer rank, lock, and hide folded into the shared block sort and hit-testing), configurable per-canvas text editing options (`textOptions` prop to toggle links and underline) with creation defaults, and reject non-finite pen stroke samples so strokes no longer spring a stray vertex at the world origin on reload.
- Updated dependencies [566fba4]
  - @woven-canvas/core@1.0.8
  - @woven-canvas/plugin-pen@1.0.6

## 1.0.13

### Patch Changes

- dbb05a6: Add polygon hit geometry with even-odd containment and capsule intersection, pen presets, and related pen tool improvements
- Updated dependencies [dbb05a6]
  - @woven-canvas/asset-sync@1.0.6
  - @woven-canvas/core@1.0.7
  - @woven-canvas/math@1.0.4
  - @woven-canvas/plugin-pen@1.0.5

## 1.0.12

### Patch Changes

- 7fb6351: readonly state and bug fixes
- Updated dependencies [7fb6351]
  - @woven-canvas/asset-sync@1.0.5
  - @woven-canvas/core@1.0.6

## 1.0.11

### Patch Changes

- 38f8455: Added frames
- 5f5300f: shape drawing and arrow bug fixing
- Updated dependencies [38f8455]
- Updated dependencies [5f5300f]
  - @woven-canvas/plugin-canvas-controls@1.0.6
  - @woven-canvas/plugin-arrows@1.0.5
  - @woven-canvas/plugin-tapes@1.0.4
  - @woven-canvas/plugin-pen@1.0.4
  - @woven-canvas/core@1.0.5

## 1.0.10

### Patch Changes

- 3ef22ce: patch
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

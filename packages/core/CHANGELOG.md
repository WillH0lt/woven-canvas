# @woven-canvas/core

## 1.3.2

### Patch Changes

- ac6aec0: Draw a white halo under the drag, resize, rotate and crosshair cursors (and widen the hand cursor's halo) so they stay visible over dark backgrounds

## 1.3.1

### Patch Changes

- 73062da: The rotate and drag cursors now show up in Firefox. Their SVGs had only a `viewBox` and no `width`/`height`, and Firefox refuses to render an SVG cursor without intrinsic dimensions — it silently fell back to the default arrow. Chrome infers a size, so it was fine there. Both SVGs now carry explicit dimensions; hotspots are unchanged.

## 1.3.0

### Minor Changes

- c698c44: Upgrade `@woven-ecs/canvas-store` from `^1.4.1` to `^2.0.1`. Because it is a peer dependency of `@woven-canvas/vue`, consumers must install `@woven-ecs/canvas-store@^2` alongside this release.

  The 2.0 release fixes silent data loss when a sync socket drops mid-flight. Previously, document patches that had been sent but not yet acknowledged were discarded on reconnect — they lived only in the in-flight map, which `flush()` had already drained out of the send buffer and which the `reconnect` frame never carried. Worse than one lost edit, the ECS adapter had already advanced its `prevState` optimistically, so every later edit to that component went out as a partial diff against a key the server had never seen; an entity whose create was lost this way could never be recovered. In-flight patches now fold back into the offline buffer, persist to IndexedDB, and replay on the next connect, making document delivery at-least-once.

  No API surface changed, and no `@woven-canvas` code needed updating.

## 1.2.0

### Minor Changes

- 12f6cf7: Shift + scroll now pans the canvas horizontally. The Shift flag from wheel events is exposed as `wheelShiftKey` on the Mouse singleton and `MouseInput`, and the scroll system maps a vertical wheel delta onto the horizontal axis while it is held. Browsers that already report shift+wheel as `deltaX` (macOS, Firefox) are left untouched.

## 1.1.0

### Minor Changes

- f411c0b: Add a block operations (…) button to the floating menu with duplicate, bring forward, send backward, and delete actions
  - New `showOperations` block def option (default `true`) shows the button on the right side of the floating menu; set it to `false` on a block def to opt out. The button is hidden when any selected block opts out.
  - The `DuplicateSelected` command now has a handler: it clones the selection in place (clones keep connector attachments) and offsets the still-selected originals by one grid cell.
  - Fixed a latent double-offset bug in clone handling: when a selection contained both a parent and its child, the child's clone was offset twice (its position is parent-relative). Clone offsets now apply only to roots of the cloned set, via the new `filterRoots` helper.
  - New `BlockOperationsButton` component exported from `@woven-canvas/vue`; override it via the `button:operations` slot on `FloatingMenuBar`

## 1.0.15

### Patch Changes

- 8b03d32: Fix Space-bar tool handoffs so an active marquee selection is cleared and an active pan ends cleanly.
- d4f0351: Add spacebar pan: hold the space bar to pan with a left mouse button drag
  - New `spaceLeftMouseTool` controls option (default `'hand'`) remaps the left mouse button while space is held; set it to an empty string to disable the remap
  - Releasing space mid-drag ends the pan immediately and restores the left mouse button to its normal tool

## 1.0.14

### Patch Changes

- daa8a29: Fix keyboard and trackpad input on Mac and Windows
  - Bind Backspace to RemoveSelected so the Mac delete key removes selected blocks
  - Handle macOS suppressing keyup events while Cmd is held: repeated shortcuts (e.g. Cmd+Z, Cmd+Z) now fire every time, and keys no longer get stuck down after a Cmd combo
  - Capture the Ctrl/Cmd flag from wheel events (`wheelModKey` on the Mouse singleton and `MouseInput`), so trackpad pinch gestures zoom instead of scrolling and mod+scroll zooms even when the canvas isn't focused
  - Normalize zoom sensitivity across input devices: per-event wheel delta is clamped so trackpad pinches (tiny, frequent deltas) zoom ~10x more than before, while mouse wheel notches feel the same

## 1.0.13

### Patch Changes

- f91b7f9: Keep the loading overlay up until the document has loaded.

  Bumps `@woven-ecs/canvas-store` to `^1.4.1` and uses its new `synced` signal: the `WovenCanvas` loading overlay now stays visible while connected and awaiting the server's first sync, instead of clearing as soon as the store finishes initializing. It clears on the first sync, immediately for a local-only/seeded store, or when offline (so the user can work offline rather than spin forever). Customize via the `loading` slot.

## 1.0.12

### Patch Changes

- 9caa3f6: Require `@woven-ecs/canvas-store` `^1.3.1`, which fixes documents sometimes loading blank after an interrupted or laggy initial sync (the resume cursor could advance ahead of applied document state, or on ephemeral acks, so a reload/reconnect mid-load fetched an empty diff).

## 1.0.11

### Patch Changes

- b1c7434: Update `@woven-ecs/canvas-store` to ^1.3.0 (server-rollback recovery / reverse resync).

## 1.0.10

### Patch Changes

- 6f5d755: Update `@woven-ecs/canvas-store` to ^1.2.0

## 1.0.9

### Patch Changes

- e7bc435: Add a `createBlock` core helper and `PlaceBlockEvent` command so plugins can spawn and place a block in one call — core parents it to the frame under its position, and other plugins (e.g. a paged-document layer system) can react to attach per-block state. Built-in placement systems and the pen plugin now route through it. Asset resolution gains a `ResolveDimensions` argument on `AssetProvider.resolveUrl`/`AssetManager.getDisplayUrl` so resizing CDN providers can return an appropriately sized variant, with image and tape blocks requesting device-pixel render sizes that only ever grow.
- 561a703: Place newly-created blocks into the frame under their center point instead of their top-left corner. `PlaceBlockEvent` now resolves the target frame from the block's center (derived from `position` and `size`) while still preserving the block's world position when it's reparented.

## 1.0.8

### Patch Changes

- 566fba4: Add a Layer z-order system (named layers with per-layer rank, lock, and hide folded into the shared block sort and hit-testing), configurable per-canvas text editing options (`textOptions` prop to toggle links and underline) with creation defaults, and reject non-finite pen stroke samples so strokes no longer spring a stray vertex at the world origin on reload.

## 1.0.7

### Patch Changes

- dbb05a6: Add polygon hit geometry with even-odd containment and capsule intersection, pen presets, and related pen tool improvements
- Updated dependencies [dbb05a6]
  - @woven-canvas/math@1.0.4

## 1.0.6

### Patch Changes

- 7fb6351: readonly state and bug fixes

## 1.0.5

### Patch Changes

- 38f8455: Added frames
- 5f5300f: shape drawing and arrow bug fixing

## 1.0.4

### Patch Changes

- 0b828ff: fix changesets release
- Updated dependencies [0b828ff]
  - @woven-canvas/math@1.0.3

## 1.0.3

### Patch Changes

- 3fb7ea6: syncing versions
- Updated dependencies [3fb7ea6]
  - @woven-canvas/math@1.0.2

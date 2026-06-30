# @woven-canvas/core

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

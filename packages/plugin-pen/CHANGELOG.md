# @woven-canvas/plugin-pen

## 1.0.7

### Patch Changes

- e7bc435: Add a `createBlock` core helper and `PlaceBlockEvent` command so plugins can spawn and place a block in one call — core parents it to the frame under its position, and other plugins (e.g. a paged-document layer system) can react to attach per-block state. Built-in placement systems and the pen plugin now route through it. Asset resolution gains a `ResolveDimensions` argument on `AssetProvider.resolveUrl`/`AssetManager.getDisplayUrl` so resizing CDN providers can return an appropriately sized variant, with image and tape blocks requesting device-pixel render sizes that only ever grow.
- Updated dependencies [e7bc435]
- Updated dependencies [561a703]
  - @woven-canvas/core@1.0.9

## 1.0.6

### Patch Changes

- 566fba4: Add a Layer z-order system (named layers with per-layer rank, lock, and hide folded into the shared block sort and hit-testing), configurable per-canvas text editing options (`textOptions` prop to toggle links and underline) with creation defaults, and reject non-finite pen stroke samples so strokes no longer spring a stray vertex at the world origin on reload.
- Updated dependencies [566fba4]
  - @woven-canvas/core@1.0.8

## 1.0.5

### Patch Changes

- dbb05a6: Add polygon hit geometry with even-odd containment and capsule intersection, pen presets, and related pen tool improvements
- Updated dependencies [dbb05a6]
  - @woven-canvas/core@1.0.7
  - @woven-canvas/math@1.0.4

## 1.0.4

### Patch Changes

- 38f8455: Added frames
- Updated dependencies [38f8455]
- Updated dependencies [5f5300f]
  - @woven-canvas/core@1.0.5

## 1.0.3

### Patch Changes

- 0b828ff: fix changesets release
- Updated dependencies [0b828ff]
  - @woven-canvas/core@1.0.4
  - @woven-canvas/math@1.0.3

## 1.0.2

### Patch Changes

- 3fb7ea6: syncing versions
- Updated dependencies [3fb7ea6]
  - @woven-canvas/core@1.0.3
  - @woven-canvas/math@1.0.2

# @woven-canvas/asset-sync

## 1.0.8

### Patch Changes

- d8ea969: Resume pending asset uploads when connectivity is regained, not just on the next load. `AssetManager.resumePendingUploads()` is now idempotent (skips in-flight uploads, reuses existing blob URLs) and resets each job's retry budget, and `WovenCanvas` calls it whenever it transitions back online. So an image queued while offline — or one that exhausted its retries during a long outage — uploads as soon as there's a connection instead of waiting for a reload.

## 1.0.7

### Patch Changes

- e7bc435: Add a `createBlock` core helper and `PlaceBlockEvent` command so plugins can spawn and place a block in one call — core parents it to the frame under its position, and other plugins (e.g. a paged-document layer system) can react to attach per-block state. Built-in placement systems and the pen plugin now route through it. Asset resolution gains a `ResolveDimensions` argument on `AssetProvider.resolveUrl`/`AssetManager.getDisplayUrl` so resizing CDN providers can return an appropriately sized variant, with image and tape blocks requesting device-pixel render sizes that only ever grow.

## 1.0.6

### Patch Changes

- dbb05a6: Add polygon hit geometry with even-odd containment and capsule intersection, pen presets, and related pen tool improvements

## 1.0.5

### Patch Changes

- 7fb6351: readonly state and bug fixes

## 1.0.4

### Patch Changes

- 0b828ff: fix changesets release

## 1.0.3

### Patch Changes

- 3fb7ea6: syncing versions

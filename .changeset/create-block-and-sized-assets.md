---
"@woven-canvas/asset-sync": patch
"@woven-canvas/core": patch
"@woven-canvas/plugin-pen": patch
"@woven-canvas/vue": patch
---

Add a `createBlock` core helper and `PlaceBlockEvent` command so plugins can spawn and place a block in one call — core parents it to the frame under its position, and other plugins (e.g. a paged-document layer system) can react to attach per-block state. Built-in placement systems and the pen plugin now route through it. Asset resolution gains a `ResolveDimensions` argument on `AssetProvider.resolveUrl`/`AssetManager.getDisplayUrl` so resizing CDN providers can return an appropriately sized variant, with image and tape blocks requesting device-pixel render sizes that only ever grow.

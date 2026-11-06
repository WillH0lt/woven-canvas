---
"@woven-canvas/vue": patch
---

Pass the canvas's `AssetManager` as a third argument to `ready`, and add a `loaded` event that fires once the document has loaded and the loading overlay lifts. UI rendered outside the canvas can now upload assets and wait for the document without reaching into the in-canvas context.

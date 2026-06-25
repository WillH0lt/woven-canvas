---
"@woven-canvas/core": patch
---

Place newly-created blocks into the frame under their center point instead of their top-left corner. `PlaceBlockEvent` now resolves the target frame from the block's center (derived from `position` and `size`) while still preserving the block's world position when it's reparented.

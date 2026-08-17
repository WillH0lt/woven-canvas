---
"@woven-canvas/vue": major
"@woven-canvas/core": minor
---

Upgrade `@woven-ecs/canvas-store` from `^1.4.1` to `^2.0.1`. Because it is a peer dependency of `@woven-canvas/vue`, consumers must install `@woven-ecs/canvas-store@^2` alongside this release.

The 2.0 release fixes silent data loss when a sync socket drops mid-flight. Previously, document patches that had been sent but not yet acknowledged were discarded on reconnect — they lived only in the in-flight map, which `flush()` had already drained out of the send buffer and which the `reconnect` frame never carried. Worse than one lost edit, the ECS adapter had already advanced its `prevState` optimistically, so every later edit to that component went out as a partial diff against a key the server had never seen; an entity whose create was lost this way could never be recovered. In-flight patches now fold back into the offline buffer, persist to IndexedDB, and replay on the next connect, making document delivery at-least-once.

No API surface changed, and no `@woven-canvas` code needed updating.

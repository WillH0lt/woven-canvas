---
"@woven-canvas/vue": minor
"@woven-canvas/core": patch
---

Keep the loading overlay up until the document has loaded.

Bumps `@woven-ecs/canvas-store` to `^1.4.1` and uses its new `synced` signal: the `WovenCanvas` loading overlay now stays visible while connected and awaiting the server's first sync, instead of clearing as soon as the store finishes initializing. It clears on the first sync, immediately for a local-only/seeded store, or when offline (so the user can work offline rather than spin forever). Customize via the `loading` slot.

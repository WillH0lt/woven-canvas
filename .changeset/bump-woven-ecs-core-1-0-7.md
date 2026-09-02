---
"@woven-canvas/core": patch
"@woven-canvas/vue": patch
---

Depend on `@woven-ecs/core` ^1.0.7, which preserves the entity generation across ID reclaim so stale `field.ref()` values no longer resolve to the entity that reuses the ID.

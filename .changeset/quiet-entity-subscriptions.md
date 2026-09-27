---
"@woven-canvas/vue": patch
---

Return null from component hooks when an entity is deleted before Vue mounts or updates its subscriptions. A stale entity ID no longer throws or prevents subscriptions for other selected entities.

---
"@woven-canvas/core": patch
"@woven-canvas/vue": patch
---

Require `@woven-ecs/canvas-store` `^1.3.1`, which fixes documents sometimes loading blank after an interrupted or laggy initial sync (the resume cursor could advance ahead of applied document state, or on ephemeral acks, so a reload/reconnect mid-load fetched an empty diff).

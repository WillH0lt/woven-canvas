---
"@woven-canvas/asset-sync": patch
"@woven-canvas/vue": patch
---

Resume pending asset uploads when connectivity is regained, not just on the next load. `AssetManager.resumePendingUploads()` is now idempotent (skips in-flight uploads, reuses existing blob URLs) and resets each job's retry budget, and `WovenCanvas` calls it whenever it transitions back online. So an image queued while offline — or one that exhausted its retries during a long outage — uploads as soon as there's a connection instead of waiting for a reload.

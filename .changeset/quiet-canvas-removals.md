---
"@woven-canvas/vue": patch
---

Keep the last valid component snapshot in useQuery when a removal notification arrives before the ECS query's membership update. The query continues to own row removal and subscription cleanup. This prevents null-reference errors in synchronous query consumers during Undo and remote edits, while preserving normal updates and remove/re-add behavior without changing ECS timing or allocating additional state.

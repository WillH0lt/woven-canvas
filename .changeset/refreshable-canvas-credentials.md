---
"@woven-canvas/core": major
"@woven-canvas/vue": major
---

Upgrade to `@woven-ecs/canvas-store` 3. WebSocket authentication now uses
`getCredentials: async () => ({ token, expiresAt })` instead of `token` and
`store.setToken()`. The store handles credential refresh and retries; `expiresAt`
is optional and uses Unix seconds. Update applications using the removed API
and install canvas-store 3 alongside the Vue package.

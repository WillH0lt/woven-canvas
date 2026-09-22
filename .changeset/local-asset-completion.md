---
"@woven-canvas/core": patch
"@woven-canvas/asset-sync": patch
"@woven-canvas/vue": patch
---

Distinguish locally saved assets with `UploadState.CompleteLocal` (`complete-local`).
Providers can declare `storage: 'local' | 'remote'`, defaulting to remote.
LocalAssetProvider declares local storage. Vue selects the matching state
after successful uploads, including resumed uploads. Upload results and
AssetManager's completion callbacks are unchanged.
Other providers continue to complete as `complete` by default. Local images remain
renderable while applications can require `complete` before publishing.

Consumers reading numeric ECS enum values must update their mapping: adding
`complete-local` shifts the indices of `failed`, `pending`, and `uploading`.

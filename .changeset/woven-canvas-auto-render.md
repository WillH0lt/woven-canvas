---
"@woven-canvas/vue": minor
---

Add `autoRender` prop and exposed `render()` method to `WovenCanvas`

`WovenCanvas` drives itself with an internal `requestAnimationFrame` loop by default. Set `:auto-render="false"` to own the loop yourself — the component then schedules no frames, and you advance each cycle by calling the exposed `render()` method via a template ref. The prop is reactive, so flipping it back to `true` resumes the internal loop.

This is intended for headless / offscreen rendering (e.g. server-side page capture), where a continuous loop is wasteful and, with a WebGPU `render-layer`, an on-screen present can race a GPU readback — owning the loop lets you step until content has settled, stop, then read pixels back with nothing presenting mid-capture.

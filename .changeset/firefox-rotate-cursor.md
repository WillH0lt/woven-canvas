---
"@woven-canvas/core": patch
---

The rotate and drag cursors now show up in Firefox. Their SVGs had only a `viewBox` and no `width`/`height`, and Firefox refuses to render an SVG cursor without intrinsic dimensions — it silently fell back to the default arrow. Chrome infers a size, so it was fine there. Both SVGs now carry explicit dimensions; hotspots are unchanged.

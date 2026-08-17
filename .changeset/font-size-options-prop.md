---
"@woven-canvas/vue": patch
---

`TextFontSizeButton` now takes a `sizeOptions` prop, so the Small / Medium / Large / Huge ladder is no longer hardcoded. The built-in values are tuned for text defaulting to 24px, which reads as almost nothing on a canvas working at another page scale — previously the only way out was to fork the component. The default ladder is exported as `DEFAULT_FONT_SIZE_OPTIONS` (with a `FontSizeOption` type) so an app can rebase it while keeping woven's relative ratios:

```ts
const scale = 100 / 24;
const sizeOptions = DEFAULT_FONT_SIZE_OPTIONS.map((o) => ({
  ...o,
  value: Math.round(o.value * scale),
}));
```

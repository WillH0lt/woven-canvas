---
"@woven-canvas/vue": minor
---

The font-size menu can work in a unit other than stored px, for canvases whose page is bigger than screen scale. On a print-pixel page where body text is stored as 100px, every number in the menu reads inflated — presets running 67 / 100 / 167 / 400, and `400` in the custom box for what a person thinks of as 96pt. `TextFontSizeButton` now takes `pxPerUnit`, and multiplies by it on the way to the text:

```vue
<!-- menu reads 16 / 24 / 40 / 96; text is written as 67 / 100 / 167 / 400 px -->
<TextFontSizeButton :entity-ids="entityIds" :px-per-unit="100 / 24" />
```

Presets, the custom box, and the steppers all work in menu units; preset matching tolerates the rounding the unit round-trip introduces. Stored sizes are untouched — the conversion happens on display and on the way in, so existing text keeps whatever `fontSizePx` it already had.

`TextButtonGroup` forwards `pxPerUnit` to the button it renders, so an app can set the unit without rebuilding the whole text strip, and it is exported from the package root now. The `button:text` slot passes `showVerticalAlign` alongside `entityIds` — overriding that slot previously dropped the vertical-align button, since the flag it depends on wasn't reachable from outside.

`FontSizeOption` drops `displayValue`, leaving `{ label, value }`. It only controlled the size a preset's own label is drawn at in the menu — a preview of where that size sits in the ladder — which is derivable from the values themselves, so requiring it of every caller was busywork and let a hand-set row drift out of step with the rest. Previews are now interpolated between the ladder's smallest and largest values on a log scale, since sizes grow multiplicatively and a linear map bunches the small end against the floor. Two consequences: passing `displayValue` is now a type error (it was introduced one release ago, in 1.6.1), and the built-in ladder's previews shift by a pixel on one row, to `10 / 12 / 15 / 20` from `10 / 12 / 16 / 20`.

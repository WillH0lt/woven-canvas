---
"@woven-canvas/vue": minor
---

Let host apps add custom TipTap marks to text blocks

`TextEditingOptions` gains an `extensions` field — extra TipTap extensions (typically marks) registered both in the live editor schema and in the parser used for selected-but-not-editing blocks, so app-defined marks survive batch edits instead of being stripped:

```ts
<WovenCanvas :text-options="{ extensions: [Highlight.configure({ multicolor: true })] }" />
```

Drive them generically via `useTextFormatting`, which now exposes:

- `commands.setMark(type, attrs?)` / `commands.unsetMark(type)` — apply/clear a mark by name, working in both edit mode (TipTap selection) and batch mode (HTML rewrite across selected blocks), like `setColor`.
- `getMarkAttrs(type)` — read a mark's attributes on the current selection / selected blocks (null if absent or mixed); reactive, call inside a `computed`.

woven-canvas stays formatting-agnostic — apps register the mark and drive it by name (e.g. a text-highlight color via a `highlight` mark). Internally the batch controller's HTML helpers were refactored to pure JSON-doc transforms with a single parse/serialize boundary, so the extension list is no longer threaded through every helper.

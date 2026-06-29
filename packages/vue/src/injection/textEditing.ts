import type { Extensions } from '@tiptap/core'
import type { ComputedRef, InjectionKey } from 'vue'

/** Per-canvas text editing behavior, set via the `textOptions` prop on WovenCanvas. */
export interface TextEditingOptions {
  /**
   * Whether hyperlinks are enabled in text blocks. When false, typed/pasted URLs are
   * no longer auto-formatted into links (tiptap's autolink / linkOnPaste). Existing
   * link marks in content still render. (Menu buttons are not affected — host apps
   * choose which formatting buttons to show by overriding the `button:text` slot.)
   *
   * @default true
   */
  links?: boolean

  /**
   * Whether underline is enabled in text blocks. When false, the underline mark is
   * left out of the editor schema, so typed/pasted underline is stripped instead of
   * stored and the Cmd/Ctrl+U shortcut is a no-op. Existing underline marks in
   * not-yet-edited content still render (re-editing the block strips them). (Menu
   * buttons are not affected — host apps choose which formatting buttons to show by
   * overriding the `button:text` slot.)
   *
   * @default true
   */
  underline?: boolean

  /**
   * Extra TipTap extensions (typically marks) to register in text blocks, so host
   * apps can add formatting woven-canvas doesn't ship — e.g. a Highlight mark for a
   * text-background color. These are added both to the live editor schema AND to the
   * parser used to read/rewrite content for selected-but-not-editing blocks, so the
   * marks survive batch edits (a custom mark omitted from the parser would be silently
   * stripped the next time any batch text change rewrites the HTML).
   *
   * Drive them generically via `useTextFormatting`'s `setMark(type, attrs)` /
   * `unsetMark(type)` / `getMarkAttrs(type)`, which work in both edit and batch modes.
   *
   * Keep the configuration stable (don't pass a freshly-built array each render) — the
   * value is read when an editor is created and when content is parsed.
   */
  extensions?: Extensions
}

export const TEXT_EDITING_OPTIONS_KEY: InjectionKey<ComputedRef<TextEditingOptions>> = Symbol.for(
  '__woven_canvas_text_editing_options__',
)

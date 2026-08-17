/** One preset row in `TextFontSizeButton`'s dropdown. */
export interface FontSizeOption {
  /** Row label in the menu, e.g. `Medium`. */
  label: string
  /** Size written to the text, in px. */
  value: number
  /** Size the row's own label is rendered at — a visual preview, not applied to the text. */
  displayValue: number
}

/**
 * Ladder `TextFontSizeButton` uses when the host app doesn't supply one. Tuned
 * for a canvas where text defaults to 24px; an app working at another page
 * scale can rebase it and pass the result as `sizeOptions`:
 *
 * ```ts
 * const scale = 100 / 24
 * const sizeOptions = DEFAULT_FONT_SIZE_OPTIONS.map((o) => ({
 *   ...o,
 *   value: Math.round(o.value * scale),
 * }))
 * ```
 */
export const DEFAULT_FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { label: 'Small', value: 16, displayValue: 10 },
  { label: 'Medium', value: 24, displayValue: 12 },
  { label: 'Large', value: 40, displayValue: 16 },
  { label: 'Huge', value: 96, displayValue: 20 },
]

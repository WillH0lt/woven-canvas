/** One preset row in `TextFontSizeButton`'s dropdown. */
export interface FontSizeOption {
  /** Row label in the menu, e.g. `Medium`. */
  label: string
  /** Size applied to the text, in menu units (see the button's `pxPerUnit`). */
  value: number
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
  { label: 'Small', value: 16 },
  { label: 'Medium', value: 24 },
  { label: 'Large', value: 40 },
  { label: 'Huge', value: 96 },
]

/** Range the row-label previews are drawn within — big enough to read, small enough to fit a row. */
const PREVIEW_MIN_PX = 10
const PREVIEW_MAX_PX = 20

/**
 * Size to render each row's label at: where its value sits between the ladder's
 * smallest and largest, mapped onto the preview range. Interpolated on a log
 * scale because size ladders grow multiplicatively — a linear map would bunch
 * every small preset against the floor.
 */
export function previewSizesPx(options: FontSizeOption[]): number[] {
  const values = options.map((option) => option.value).filter((value) => value > 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const midpoint = (PREVIEW_MIN_PX + PREVIEW_MAX_PX) / 2

  return options.map((option) => {
    // One distinct size (or a nonsense one) has no ladder to sit in.
    if (!(option.value > 0) || max <= min) return midpoint

    const position = (Math.log(option.value) - Math.log(min)) / (Math.log(max) - Math.log(min))
    return Math.round(PREVIEW_MIN_PX + position * (PREVIEW_MAX_PX - PREVIEW_MIN_PX))
  })
}

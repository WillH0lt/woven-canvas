import { Color } from '../../components'

/** Ensures a number stays within a minimum and maximum value */
export function clamp(value: number, min: number, max: number) {
  const noNegativeZero = (n: number) => (Object.is(n, -0) ? 0 : n)

  if (value < min) {
    return noNegativeZero(min)
  }

  if (value > max) {
    return noNegativeZero(max)
  }

  return noNegativeZero(value)
}

export function colorToHex(color: Color): string {
  const r = color.red.toString(16).padStart(2, '0')
  const g = color.green.toString(16).padStart(2, '0')
  const b = color.blue.toString(16).padStart(2, '0')
  const a = color.alpha.toString(16).padStart(2, '0')
  return `#${r}${g}${b}${a}`
}

export function hexToColor(hex: string): Color {
  const color = new Color()
  color.red = Number.parseInt(hex.slice(1, 3), 16)
  color.green = Number.parseInt(hex.slice(3, 5), 16)
  color.blue = Number.parseInt(hex.slice(5, 7), 16)
  color.alpha = hex.length > 7 ? Number.parseInt(hex.slice(7, 9), 16) : 255
  return color
}

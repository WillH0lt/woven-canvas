interface Color {
  red: number
  green: number
  blue: number
  alpha: number
}

export function colorToHex(color: Color): string {
  const rHex = color.red.toString(16).padStart(2, '0')
  const gHex = color.green.toString(16).padStart(2, '0')
  const bHex = color.blue.toString(16).padStart(2, '0')
  const aHex = color.alpha.toString(16).padStart(2, '0')
  return `#${rHex}${gHex}${bHex}${aHex}`
}

export function hexToColor(hex: string): Color {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  const alpha = hex.length > 7 ? Number.parseInt(hex.slice(7, 9), 16) : 255
  return { red, green, blue, alpha }
}

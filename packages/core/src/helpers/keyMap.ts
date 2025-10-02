const keyMap = {
  ']': 'rightBracket',
  '[': 'leftBracket',
}

export function getKeyName(event: KeyboardEvent): string {
  const key = event.key
  if (key in keyMap) {
    return keyMap[key as keyof typeof keyMap]
  }
  return key.toLowerCase()
}

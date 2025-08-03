export function lowercaseFirstLetter(str: string): string {
  if (typeof str !== 'string' || str.length === 0) {
    return str
  }
  return str[0].toLowerCase() + str.slice(1)
}

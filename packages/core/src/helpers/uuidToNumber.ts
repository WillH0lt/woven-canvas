// parseInt(uid.substring(20).replace(re, ""), 10)

export function uuidToNumber(uuid: string): number {
  // Convert the UUID to a number by taking the first 16 characters and converting them to a base-16 number
  const hex = uuid.replace(/-/g, '').slice(0, 16)

  // Parse the hex string as a base-16 integer
  return Number.parseInt(hex, 16)
}

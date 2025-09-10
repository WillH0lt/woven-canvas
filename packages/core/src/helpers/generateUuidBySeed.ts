/**
 * Simple hash function to generate pseudo-random numbers from a seed
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded pseudo-random number generator
 */
class SeededRandom {
  private seed: number

  constructor(seed: string | number) {
    this.seed = typeof seed === 'string' ? simpleHash(seed) : seed
  }

  /**
   * Generate next pseudo-random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  /**
   * Generate pseudo-random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Generate pseudo-random hex digit
   */
  nextHex(): string {
    return this.nextInt(0, 15).toString(16)
  }
}

/**
 * Generate a predictable UUID v4 from a seed value
 * @param seed - String or number to use as seed
 * @returns UUID string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUuidBySeed(seed: string | number): string {
  const rng = new SeededRandom(seed)

  let uuid = ''

  // Generate 32 hex characters with hyphens in the right places
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) {
      uuid += '-'
    }

    if (i === 12) {
      // Version 4 UUID - set version to 4
      uuid += '4'
    } else if (i === 16) {
      // Variant bits - set to 10xx (8, 9, A, or B)
      const variants = ['8', '9', 'a', 'b']
      uuid += variants[rng.nextInt(0, 3)]
    } else {
      uuid += rng.nextHex()
    }
  }

  return uuid
}

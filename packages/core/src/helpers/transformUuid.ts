// Seeded random number generator (LCG algorithm)
class SeededRandom {
  private seed: number

  constructor(seed: string) {
    // Convert seed string to number
    this.seed = this.hashSeed(seed)
  }

  private hashSeed(seed: string): number {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  next(): number {
    // Linear Congruential Generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }

  nextByte(): number {
    return Math.floor(this.next() * 256)
  }
}

// Convert UUID string to byte array
function uuidToBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, '')
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(Number.parseInt(hex.substring(i, i + 2), 16))
  }
  return bytes
}

// Convert byte array to UUID string
function bytesToUuid(bytes: number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`
}

/**
 * Transform a UUID deterministically using a seed
 * @param uuid - The input UUID
 * @param seed - Random seed string
 * @returns Transformed UUID
 */
export function transformUuid(uuid: string, seed: string): string {
  const rng = new SeededRandom(seed)
  const bytes = uuidToBytes(uuid)

  // XOR each byte with a random byte from the seeded RNG
  const transformed = bytes.map((b) => b ^ rng.nextByte())

  return bytesToUuid(transformed)
}

/**
 * Reverse the UUID transformation using the same seed
 * @param transformedUuid - The transformed UUID
 * @param seed - The same random seed string used in transformation
 * @returns Original UUID
 */
export function reverseTransformUuid(transformedUuid: string, seed: string): string {
  // XOR is its own inverse, so we can use the same operation
  return transformUuid(transformedUuid, seed)
}

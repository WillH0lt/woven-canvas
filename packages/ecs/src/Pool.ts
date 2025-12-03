// index pool used in EntityBuffer
// copied from https://github.com/zandaqo/structurae

type Bit = 0 | 1;

type BitPosition = {
  bucket: number;
  position: number;
};

/**
 * Lookup table for powers of 2
 */
const log2: Record<number, number> = {
  1: 0,
  2: 1,
  4: 2,
  8: 3,
  16: 4,
  32: 5,
  64: 6,
  128: 7,
  256: 8,
  512: 9,
  1024: 10,
  2048: 11,
  4096: 12,
  8192: 13,
  16384: 14,
  32768: 15,
  65536: 16,
  131072: 17,
  262144: 18,
  524288: 19,
  1048576: 20,
  2097152: 21,
  4194304: 22,
  8388608: 23,
  16777216: 24,
  33554432: 25,
  67108864: 26,
  134217728: 27,
  268435456: 28,
  536870912: 29,
  1073741824: 30,
  2147483648: 31,
};

/**
 * Returns the index of the Least Significant Bit in a number.
 *
 * @param value the number
 * @return the index of LSB
 */
function getLSBIndex(value: number): number {
  if (value === 2147483648) return 31;
  return log2[value & -value];
}

/**
 * Uses Uint32Array as an array or vector of bits. It's a simpler version of BitField
 * that only sets and checks individual bits.
 *
 * @example
 * const array = BitArray.create(10);
 * array.getBit(0);
 * //=> 0
 * array.setBit(0).getBit(0);
 * //=> 1
 * array.size;
 * //=> 10
 * array.length;
 * //=> 1
 */
class BitArray extends Uint32Array {
  lastPosition: BitPosition = { bucket: 0, position: 0 };

  static get [Symbol.species](): Uint32ArrayConstructor {
    return Uint32Array;
  }

  /**
   * The amount of bits in the array.
   */
  get size(): number {
    return this.length << 5;
  }

  /**
   * Creates a BitArray of the specified size.
   *
   * @param size the maximum amount of bits in the array
   * @return a new BitArray
   */
  static create<T extends typeof BitArray>(
    this: T,
    size: number
  ): InstanceType<T> {
    return new this(this.getLength(size)) as InstanceType<T>;
  }

  /**
   * Returns the length of the underlying TypedArray required to hold the given amount of bits.
   *
   * @param size the amount of bits
   * @return the required length
   */
  static getLength(size: number): number {
    return Math.ceil(size / 32);
  }

  /**
   * Returns the bit at a given index.
   *
   * @param index the index
   * @return the bit
   */
  getBit(index: number): Bit {
    const { bucket, position } = this.getBitPosition(index);
    return ((this[bucket] >> position) & 1) as Bit;
  }

  getBitPosition(index: number): BitPosition {
    const bucket = index >> 5;
    this.lastPosition.bucket = bucket;
    this.lastPosition.position = index - (bucket << 5);
    return this.lastPosition;
  }

  /**
   * Sets the bit at a given index.
   *
   * @param index the index
   * @param value the value
   * @return this
   */
  setBit(index: number, value: Bit = 1): this {
    const { bucket, position } = this.getBitPosition(index);
    this[bucket] = (this[bucket] & ~(1 << position)) | (value << position);
    return this;
  }
}

/**
 * Implements a fast algorithm to manage availability of objects in an object pool using a BitArray.
 *
 * @example
 * // create a pool of 1600 indexes
 * const pool = Pool.create(100 * 16);
 *
 * // get the next available index and make it unavailable
 * pool.get();
 * //=> 0
 * pool.get();
 * //=> 1
 *
 * // set index available
 * pool.free(0);
 * pool.get();
 * //=> 0
 *
 * pool.get();
 * //=> 2
 */
export class Pool extends BitArray {
  nextAvailable = 0;

  /**
   * Creates a Pool of the specified size.
   *
   * @param size the size of the pool
   * @return a new Pool
   */
  static create<T extends typeof BitArray>(
    this: T,
    size: number
  ): InstanceType<T> {
    const pool = new this(this.getLength(size));
    pool.fill(4294967295);
    return pool as InstanceType<T>;
  }

  /**
   * Makes a given index available.
   *
   * @param index index to be freed
   */
  free(index: number): void {
    const { bucket, position } = this.getBitPosition(index);
    this[bucket] |= 1 << position;
    this.nextAvailable = bucket;
  }

  /**
   * Gets the next available index in the pool.
   *
   * @return the next available index
   */
  get(): number {
    const { nextAvailable } = this;
    if (!~nextAvailable) return -1;
    const record = this[nextAvailable];
    const index = getLSBIndex(record);
    this[nextAvailable] &= ~(1 << index);

    // record is full, find next empty
    if (this[nextAvailable] === 0) {
      this.nextAvailable = -1;
      for (let i = 0; i < this.length; i++) {
        if (this[i] !== 0) {
          this.nextAvailable = i;
          break;
        }
      }
    }

    return (nextAvailable << 5) + index;
  }
}

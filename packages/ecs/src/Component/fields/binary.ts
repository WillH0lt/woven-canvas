import type { EntityId } from "../../World";
import type { ComponentBuffer, BinaryFieldDef } from "../types";
import type { Field } from "./field";

const DEFAULT_BINARY_BYTES = 256;

/**
 * BinaryBufferView provides access to binary data stored in a flat buffer
 * Each entry has a 4-byte length prefix followed by the binary data
 */
export class BinaryBufferView {
  private buffer: Uint8Array;
  private bytesPerEntry: number;
  private capacity: number;
  public static readonly LENGTH_BYTES = 4; // uint32 for length prefix

  constructor(buffer: ArrayBuffer, capacity: number, bytesPerEntry: number) {
    this.buffer = new Uint8Array(buffer);
    this.bytesPerEntry = bytesPerEntry;
    this.capacity = capacity;
  }

  get length(): number {
    return this.capacity;
  }

  /**
   * Get binary data for an entity
   * Returns a new Uint8Array containing a copy of the stored data
   * @param index - The entity index
   * @returns A Uint8Array containing the binary data
   */
  get(index: number): Uint8Array {
    const offset = index * this.bytesPerEntry;
    const b0 = this.buffer[offset];
    const b1 = this.buffer[offset + 1];
    const b2 = this.buffer[offset + 2];
    const b3 = this.buffer[offset + 3];
    const storedLength = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);

    if (storedLength === 0) {
      return new Uint8Array(0);
    }

    const dataStart = offset + BinaryBufferView.LENGTH_BYTES;
    // Return a copy of the data to prevent external modifications
    return new Uint8Array(
      this.buffer.subarray(dataStart, dataStart + storedLength)
    );
  }

  /**
   * Set binary data for an entity
   * @param index - The entity index
   * @param value - The binary data to store (Uint8Array)
   */
  set(index: number, value: Uint8Array): void {
    const offset = index * this.bytesPerEntry;
    const maxDataBytes = this.bytesPerEntry - BinaryBufferView.LENGTH_BYTES;
    const bytesToCopy = Math.min(value.length, maxDataBytes);

    // Write length prefix (little-endian uint32)
    this.buffer[offset] = bytesToCopy & 0xff;
    this.buffer[offset + 1] = (bytesToCopy >> 8) & 0xff;
    this.buffer[offset + 2] = (bytesToCopy >> 16) & 0xff;
    this.buffer[offset + 3] = (bytesToCopy >> 24) & 0xff;

    // Clear the data area first
    this.buffer.fill(
      0,
      offset + BinaryBufferView.LENGTH_BYTES,
      offset + this.bytesPerEntry
    );

    // Copy the binary data
    this.buffer.set(
      value.subarray(0, bytesToCopy),
      offset + BinaryBufferView.LENGTH_BYTES
    );
  }

  getBuffer(): Uint8Array {
    return this.buffer;
  }
}

export const BinaryField: Field = {
  initializeStorage(capacity: number, config: BinaryFieldDef) {
    const maxDataLength = config.maxLength || DEFAULT_BINARY_BYTES;
    // Add length prefix bytes to the user-specified max data length
    const bytesPerEntry = maxDataLength + BinaryBufferView.LENGTH_BYTES;
    const buffer = new ArrayBuffer(capacity * bytesPerEntry);
    const view = new BinaryBufferView(buffer, capacity, bytesPerEntry);
    return { buffer, view };
  },

  defineReadonly(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    Object.defineProperty(master, field, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[field];
        return array.get(getEntityId());
      },
    });
  },

  defineWritable(
    master: any,
    field: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    Object.defineProperty(master, field, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[field];
        return array.get(getEntityId());
      },
      set: (value: any) => {
        const array = (buffer as any)[field];
        array.set(getEntityId(), value);
      },
    });
  },

  getDefaultValue(fieldDef: BinaryFieldDef) {
    return fieldDef.default !== undefined
      ? fieldDef.default
      : new Uint8Array(0);
  },

  setValue(array: any, entityId: EntityId, value: any) {
    array.set(entityId, value);
  },

  growStorage(oldArray: any, newCapacity: number, config: BinaryFieldDef) {
    const maxDataLength = config.maxLength || DEFAULT_BINARY_BYTES;
    // Add length prefix bytes to the user-specified max data length
    const bytesPerEntry = maxDataLength + BinaryBufferView.LENGTH_BYTES;
    const newBuffer = new ArrayBuffer(newCapacity * bytesPerEntry);
    const newView = new BinaryBufferView(newBuffer, newCapacity, bytesPerEntry);

    // Copy existing binary data to new buffer
    const oldView = oldArray as BinaryBufferView;
    const oldBuffer = oldView.getBuffer();
    const newBufferArray = newView.getBuffer();
    const bytesToCopy = Math.min(oldBuffer.length, newBufferArray.length);
    newBufferArray.set(oldBuffer.subarray(0, bytesToCopy));

    return { buffer: newBuffer, view: newView };
  },
};

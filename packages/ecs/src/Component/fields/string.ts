import type { EntityId } from "../../types";
import type { ComponentBuffer, StringFieldDef } from "../types";
import type { Field } from "./field";

const DEFAULT_STRING_BYTES = 512;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class StringBufferView {
  private buffer: Uint8Array;
  private bytesPerString: number;
  private capacity: number;
  public static readonly LENGTH_BYTES = 4; // uint32 for length prefix

  constructor(
    buffer: ArrayBufferLike,
    capacity: number,
    bytesPerString: number
  ) {
    this.buffer = new Uint8Array(buffer);
    this.bytesPerString = bytesPerString;
    this.capacity = capacity;
  }

  get length(): number {
    return this.capacity;
  }

  get(index: number): string {
    const offset = index * this.bytesPerString;
    const b0 = this.buffer[offset];
    const b1 = this.buffer[offset + 1];
    const b2 = this.buffer[offset + 2];
    const b3 = this.buffer[offset + 3];
    const storedLength = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    if (storedLength === 0) return "";
    const dataStart = offset + StringBufferView.LENGTH_BYTES;
    const stringBytes = this.buffer.subarray(
      dataStart,
      dataStart + storedLength
    );
    return textDecoder.decode(stringBytes);
  }

  set(index: number, value: string): void {
    const offset = index * this.bytesPerString;
    const encoded = textEncoder.encode(value);
    const maxDataBytes = this.bytesPerString - StringBufferView.LENGTH_BYTES;
    const bytesToCopy = Math.min(encoded.length, maxDataBytes);
    this.buffer[offset] = bytesToCopy & 0xff;
    this.buffer[offset + 1] = (bytesToCopy >> 8) & 0xff;
    this.buffer[offset + 2] = (bytesToCopy >> 16) & 0xff;
    this.buffer[offset + 3] = (bytesToCopy >> 24) & 0xff;
    this.buffer.fill(
      0,
      offset + StringBufferView.LENGTH_BYTES,
      offset + this.bytesPerString
    );
    this.buffer.set(
      encoded.subarray(0, bytesToCopy),
      offset + StringBufferView.LENGTH_BYTES
    );
  }

  getBuffer(): Uint8Array {
    return this.buffer;
  }
}

export const StringField: Field = {
  initializeStorage(
    capacity: number,
    config: StringFieldDef,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const maxDataLength = config.maxLength || DEFAULT_STRING_BYTES;
    // Add length prefix bytes to the user-specified max data length
    const bytesPerString = maxDataLength + StringBufferView.LENGTH_BYTES;
    const buffer = new BufferConstructor(capacity * bytesPerString);
    const view = new StringBufferView(buffer, capacity, bytesPerString);
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

  getDefaultValue(fieldDef: StringFieldDef) {
    return fieldDef.default !== undefined ? fieldDef.default : "";
  },

  setValue(array: any, entityId: EntityId, value: any) {
    array.set(entityId, value);
  },
};

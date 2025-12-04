import type { EntityId } from "../../types";
import type {
  ComponentBuffer,
  TupleFieldDef,
  NumberFieldDef,
  StringFieldDef,
  BooleanFieldDef,
  BinaryFieldDef,
} from "../types";
import type { Field } from "./field";
import { getBytesPerElement } from "./number";

const DEFAULT_STRING_BYTES = 512;
const DEFAULT_BINARY_BYTES = 256;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Calculate bytes per element based on element definition
 * Ensures proper alignment for typed array access
 */
function getElementBytesPerEntry(
  elementDef: StringFieldDef | NumberFieldDef | BooleanFieldDef | BinaryFieldDef
): number {
  switch (elementDef.type) {
    case "number":
      return getBytesPerElement(elementDef.btype);
    case "boolean":
      return 1;
    case "string": {
      const maxLength = elementDef.maxLength || DEFAULT_STRING_BYTES;
      // 4 bytes for length prefix + data, aligned to 4 bytes
      return Math.ceil((maxLength + 4) / 4) * 4;
    }
    case "binary": {
      const maxLength = elementDef.maxLength || DEFAULT_BINARY_BYTES;
      // 4 bytes for length prefix + data, aligned to 4 bytes
      return Math.ceil((maxLength + 4) / 4) * 4;
    }
  }
}

/**
 * Create a typed array with a specific byte offset
 */
function createTypedArrayAtOffset(
  btype: string,
  size: number,
  buffer: ArrayBufferLike,
  byteOffset: number
):
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array {
  switch (btype) {
    case "float32":
      return new Float32Array(buffer, byteOffset, size);
    case "float64":
      return new Float64Array(buffer, byteOffset, size);
    case "int8":
      return new Int8Array(buffer, byteOffset, size);
    case "int16":
      return new Int16Array(buffer, byteOffset, size);
    case "int32":
      return new Int32Array(buffer, byteOffset, size);
    case "uint8":
      return new Uint8Array(buffer, byteOffset, size);
    case "uint16":
      return new Uint16Array(buffer, byteOffset, size);
    case "uint32":
      return new Uint32Array(buffer, byteOffset, size);
    default:
      throw new Error(`Unknown btype: ${btype}`);
  }
}

/**
 * TupleBufferView provides access to tuple data stored in a flat buffer
 * Unlike ArrayBufferView, tuples have a fixed length and no length prefix is stored
 * Supports all element types: number, boolean, string, and binary
 */
export class TupleBufferView {
  private buffer: ArrayBufferLike;
  private bytesPerEntry: number;
  private bytesPerElement: number;
  private capacity: number;
  private elementDef:
    | StringFieldDef
    | NumberFieldDef
    | BooleanFieldDef
    | BinaryFieldDef;
  private tupleLength: number;

  constructor(
    buffer: ArrayBufferLike,
    capacity: number,
    bytesPerEntry: number,
    elementDef:
      | StringFieldDef
      | NumberFieldDef
      | BooleanFieldDef
      | BinaryFieldDef,
    tupleLength: number
  ) {
    this.buffer = buffer;
    this.bytesPerEntry = bytesPerEntry;
    this.bytesPerElement = getElementBytesPerEntry(elementDef);
    this.capacity = capacity;
    this.elementDef = elementDef;
    this.tupleLength = tupleLength;
  }

  get length(): number {
    return this.capacity;
  }

  /**
   * Get tuple data for an entity
   * @param index - The entity index
   * @returns A tuple array containing the data
   */
  get(index: number): any[] {
    const offset = index * this.bytesPerEntry;
    const result: any[] = [];

    switch (this.elementDef.type) {
      case "number": {
        const typedArray = createTypedArrayAtOffset(
          this.elementDef.btype,
          this.tupleLength,
          this.buffer,
          offset
        );
        for (let i = 0; i < this.tupleLength; i++) {
          result.push(typedArray[i]);
        }
        break;
      }
      case "boolean": {
        const boolArray = new Uint8Array(this.buffer, offset, this.tupleLength);
        for (let i = 0; i < this.tupleLength; i++) {
          result.push(boolArray[i] !== 0);
        }
        break;
      }
      case "string": {
        for (let i = 0; i < this.tupleLength; i++) {
          const strOffset = offset + i * this.bytesPerElement;
          const strLenView = new Uint32Array(this.buffer, strOffset, 1);
          const strLen = strLenView[0];
          if (strLen === 0) {
            result.push("");
          } else {
            const strData = new Uint8Array(this.buffer, strOffset + 4, strLen);
            result.push(textDecoder.decode(strData));
          }
        }
        break;
      }
      case "binary": {
        for (let i = 0; i < this.tupleLength; i++) {
          const binOffset = offset + i * this.bytesPerElement;
          const binLenView = new Uint32Array(this.buffer, binOffset, 1);
          const binLen = binLenView[0];
          if (binLen === 0) {
            result.push(new Uint8Array(0));
          } else {
            const binData = new Uint8Array(this.buffer, binOffset + 4, binLen);
            result.push(new Uint8Array(binData)); // Return a copy
          }
        }
        break;
      }
    }

    return result;
  }

  /**
   * Set tuple data for an entity
   * @param index - The entity index
   * @param value - The tuple data to store (must match tuple length)
   */
  set(index: number, value: any[]): void {
    const offset = index * this.bytesPerEntry;
    const elementsToCopy = Math.min(value.length, this.tupleLength);

    // Clear the data area first
    const clearView = new Uint8Array(
      this.buffer,
      offset,
      this.tupleLength * this.bytesPerElement
    );
    clearView.fill(0);

    if (elementsToCopy === 0) return;

    switch (this.elementDef.type) {
      case "number": {
        const typedArray = createTypedArrayAtOffset(
          this.elementDef.btype,
          this.tupleLength,
          this.buffer,
          offset
        );
        for (let i = 0; i < elementsToCopy; i++) {
          typedArray[i] = value[i];
        }
        break;
      }
      case "boolean": {
        const boolArray = new Uint8Array(this.buffer, offset, this.tupleLength);
        for (let i = 0; i < elementsToCopy; i++) {
          boolArray[i] = value[i] ? 1 : 0;
        }
        break;
      }
      case "string": {
        const maxDataBytes = this.bytesPerElement - 4;
        for (let i = 0; i < elementsToCopy; i++) {
          const strOffset = offset + i * this.bytesPerElement;
          const str = value[i] as string;
          const encoded = textEncoder.encode(str);
          const bytesToCopy = Math.min(encoded.length, maxDataBytes);

          // Write string length
          const strLenView = new Uint32Array(this.buffer, strOffset, 1);
          strLenView[0] = bytesToCopy;

          // Write string data
          const strData = new Uint8Array(
            this.buffer,
            strOffset + 4,
            bytesToCopy
          );
          strData.set(encoded.subarray(0, bytesToCopy));
        }
        break;
      }
      case "binary": {
        const maxDataBytes = this.bytesPerElement - 4;
        for (let i = 0; i < elementsToCopy; i++) {
          const binOffset = offset + i * this.bytesPerElement;
          const bin = value[i] as Uint8Array;
          const bytesToCopy = Math.min(bin.length, maxDataBytes);

          // Write binary length
          const binLenView = new Uint32Array(this.buffer, binOffset, 1);
          binLenView[0] = bytesToCopy;

          // Write binary data
          const binData = new Uint8Array(
            this.buffer,
            binOffset + 4,
            bytesToCopy
          );
          binData.set(bin.subarray(0, bytesToCopy));
        }
        break;
      }
    }
  }

  getBuffer(): ArrayBufferLike {
    return this.buffer;
  }

  getBytesPerEntry(): number {
    return this.bytesPerEntry;
  }
}

export const TupleField: Field = {
  initializeStorage(
    capacity: number,
    config: TupleFieldDef,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const bytesPerElement = getElementBytesPerEntry(config.elementDef);
    // No length prefix needed for tuples - fixed size
    const bytesPerEntry = config.length * bytesPerElement;

    // Ensure proper alignment for typed arrays (8-byte alignment for float64)
    const alignedBytesPerEntry = Math.ceil(bytesPerEntry / 8) * 8;

    const buffer = new BufferConstructor(capacity * alignedBytesPerEntry);
    const view = new TupleBufferView(
      buffer,
      capacity,
      alignedBytesPerEntry,
      config.elementDef,
      config.length
    );
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
        const tuple = (buffer as any)[field];
        return tuple.get(getEntityId());
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
        const tuple = (buffer as any)[field];
        return tuple.get(getEntityId());
      },
      set: (value: any) => {
        const tuple = (buffer as any)[field];
        tuple.set(getEntityId(), value);
      },
    });
  },

  getDefaultValue(fieldDef: TupleFieldDef) {
    if (fieldDef.default !== undefined) {
      return fieldDef.default;
    }
    // Return an array filled with default values for the element type
    const elementDefault = getElementDefault(fieldDef.elementDef);
    return Array(fieldDef.length).fill(elementDefault);
  },

  setValue(tuple: any, entityId: EntityId, value: any) {
    tuple.set(entityId, value);
  },
};

/**
 * Get the default value for an element type
 */
function getElementDefault(
  elementDef: StringFieldDef | NumberFieldDef | BooleanFieldDef | BinaryFieldDef
): any {
  switch (elementDef.type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    case "string":
      return "";
    case "binary":
      return new Uint8Array(0);
  }
}

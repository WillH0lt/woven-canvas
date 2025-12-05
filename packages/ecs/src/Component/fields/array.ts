import type { EntityId } from "../../types";
import type {
  ComponentBuffer,
  ArrayFieldDef,
  NumberFieldDef,
  StringFieldDef,
  BooleanFieldDef,
  BinaryFieldDef,
} from "../types";
import { Field } from "./field";
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
 * ArrayBufferView provides access to array data stored in a flat buffer
 * Each entry has a 4-byte length prefix (element count) followed by the array data
 * Supports all element types: number, boolean, string, and binary
 */
export class ArrayBufferView {
  private buffer: ArrayBufferLike;
  private bytesPerEntry: number;
  private bytesPerElement: number;
  private capacity: number;
  private elementDef:
    | StringFieldDef
    | NumberFieldDef
    | BooleanFieldDef
    | BinaryFieldDef;
  private maxLength: number;
  public static readonly LENGTH_BYTES = 4; // uint32 for array length prefix

  constructor(
    buffer: ArrayBufferLike,
    capacity: number,
    bytesPerEntry: number,
    elementDef:
      | StringFieldDef
      | NumberFieldDef
      | BooleanFieldDef
      | BinaryFieldDef,
    maxLength: number
  ) {
    this.buffer = buffer;
    this.bytesPerEntry = bytesPerEntry;
    this.bytesPerElement = getElementBytesPerEntry(elementDef);
    this.capacity = capacity;
    this.elementDef = elementDef;
    this.maxLength = maxLength;
  }

  get length(): number {
    return this.capacity;
  }

  /**
   * Get array data for an entity
   * @param index - The entity index
   * @returns An array containing the data
   */
  get(index: number): any[] {
    const offset = index * this.bytesPerEntry;
    const lengthView = new Uint32Array(this.buffer, offset, 1);
    const storedLength = lengthView[0];

    if (storedLength === 0) {
      return [];
    }

    const dataOffset = offset + ArrayBufferView.LENGTH_BYTES;
    const result: any[] = [];

    switch (this.elementDef.type) {
      case "number": {
        const typedArray = createTypedArrayAtOffset(
          this.elementDef.btype,
          storedLength,
          this.buffer,
          dataOffset
        );
        for (let i = 0; i < storedLength; i++) {
          result.push(typedArray[i]);
        }
        break;
      }
      case "boolean": {
        const boolArray = new Uint8Array(this.buffer, dataOffset, storedLength);
        for (let i = 0; i < storedLength; i++) {
          result.push(boolArray[i] !== 0);
        }
        break;
      }
      case "string": {
        for (let i = 0; i < storedLength; i++) {
          const strOffset = dataOffset + i * this.bytesPerElement;
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
        for (let i = 0; i < storedLength; i++) {
          const binOffset = dataOffset + i * this.bytesPerElement;
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
   * Set array data for an entity
   * @param index - The entity index
   * @param value - The array data to store
   */
  set(index: number, value: any[]): void {
    const offset = index * this.bytesPerEntry;
    const elementsToCopy = Math.min(value.length, this.maxLength);

    // Write array length prefix
    const lengthView = new Uint32Array(this.buffer, offset, 1);
    lengthView[0] = elementsToCopy;

    const dataOffset = offset + ArrayBufferView.LENGTH_BYTES;

    // Clear the data area first
    const clearView = new Uint8Array(
      this.buffer,
      dataOffset,
      this.maxLength * this.bytesPerElement
    );
    clearView.fill(0);

    if (elementsToCopy === 0) return;

    switch (this.elementDef.type) {
      case "number": {
        const typedArray = createTypedArrayAtOffset(
          this.elementDef.btype,
          elementsToCopy,
          this.buffer,
          dataOffset
        );
        for (let i = 0; i < elementsToCopy; i++) {
          typedArray[i] = value[i];
        }
        break;
      }
      case "boolean": {
        const boolArray = new Uint8Array(
          this.buffer,
          dataOffset,
          elementsToCopy
        );
        for (let i = 0; i < elementsToCopy; i++) {
          boolArray[i] = value[i] ? 1 : 0;
        }
        break;
      }
      case "string": {
        const maxDataBytes = this.bytesPerElement - 4;
        for (let i = 0; i < elementsToCopy; i++) {
          const strOffset = dataOffset + i * this.bytesPerElement;
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
          const binOffset = dataOffset + i * this.bytesPerElement;
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

export class ArrayField extends Field<ArrayFieldDef> {
  initializeStorage(
    capacity: number,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const bytesPerElement = getElementBytesPerEntry(this.fieldDef.elementDef);
    // Add array length prefix bytes
    const bytesPerEntry =
      this.fieldDef.maxLength * bytesPerElement + ArrayBufferView.LENGTH_BYTES;

    // Ensure proper alignment for typed arrays (8-byte alignment for float64)
    const alignedBytesPerEntry = Math.ceil(bytesPerEntry / 8) * 8;

    const buffer = new BufferConstructor(capacity * alignedBytesPerEntry);
    const view = new ArrayBufferView(
      buffer,
      capacity,
      alignedBytesPerEntry,
      this.fieldDef.elementDef,
      this.fieldDef.maxLength
    );
    return { buffer, view };
  }

  defineReadonly(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName];
        return array.get(getEntityId());
      },
    });
  }

  defineWritable(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId
  ) {
    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName];
        return array.get(getEntityId());
      },
      set: (value: any) => {
        const array = (buffer as any)[fieldName];
        array.set(getEntityId(), value);
      },
    });
  }

  getDefaultValue() {
    return this.fieldDef.default !== undefined ? this.fieldDef.default : [];
  }

  setValue(array: any, entityId: EntityId, value: any) {
    array.set(entityId, value);
  }
}

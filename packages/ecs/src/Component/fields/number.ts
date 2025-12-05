import type { EntityId } from "../../types";
import type {
  ComponentBuffer,
  NumberFieldDef,
  NumberSubtype,
  TypedArray,
} from "../types";
import { Field } from "./field";

/**
 * Get the bytes per element for a numeric type
 * @param btype - The numeric type
 * @returns The number of bytes per element
 */
export function getBytesPerElement(btype: NumberSubtype): number {
  switch (btype) {
    case "uint8":
    case "int8":
      return 1;
    case "uint16":
    case "int16":
      return 2;
    case "uint32":
    case "int32":
    case "float32":
      return 4;
    case "float64":
      return 8;
  }
}

/**
 * Create the appropriate TypedArray based on field type
 * Uses ArrayBufferLike as backing storage (SharedArrayBuffer or ArrayBuffer)
 * @param btype - The numeric type
 * @param size - The size of the array
 * @param buffer - The backing ArrayBufferLike
 * @returns The created TypedArray
 */
export function createTypedArray(
  btype: NumberSubtype,
  size: number,
  buffer: ArrayBufferLike
): TypedArray {
  switch (btype) {
    case "uint8":
      return new Uint8Array(buffer, 0, size);
    case "uint16":
      return new Uint16Array(buffer, 0, size);
    case "uint32":
      return new Uint32Array(buffer, 0, size);
    case "int8":
      return new Int8Array(buffer, 0, size);
    case "int16":
      return new Int16Array(buffer, 0, size);
    case "int32":
      return new Int32Array(buffer, 0, size);
    case "float32":
      return new Float32Array(buffer, 0, size);
    case "float64":
      return new Float64Array(buffer, 0, size);
  }
}

export class NumberField extends Field<NumberFieldDef> {
  initializeStorage(
    capacity: number,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const bytesPerElement = getBytesPerElement(this.fieldDef.btype);
    const buffer = new BufferConstructor(capacity * bytesPerElement);
    const view = createTypedArray(this.fieldDef.btype, capacity, buffer);
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
        return array[getEntityId()];
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
        return array[getEntityId()];
      },
      set: (value: any) => {
        const array = (buffer as any)[fieldName];
        array[getEntityId()] = value;
      },
    });
  }

  getDefaultValue() {
    return this.fieldDef.default !== undefined ? this.fieldDef.default : 0;
  }

  setValue(array: any, entityId: EntityId, value: any) {
    array[entityId] = value;
  }
}

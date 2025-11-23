import type { EntityId } from "../../World";
import type {
  ComponentBuffer,
  NumberFieldDef,
  NumberSubtype,
  TypedArray,
} from "../types";
import type { FieldHandler } from "./FieldHandler";

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
 * Uses ArrayBuffer as backing storage to enable future SharedArrayBuffer support
 * @param btype - The numeric type
 * @param size - The size of the array
 * @param buffer - The backing ArrayBuffer
 * @returns The created TypedArray
 */
export function createTypedArray(
  btype: NumberSubtype,
  size: number,
  buffer: ArrayBuffer
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

export const NumberFieldHandler: FieldHandler = {
  initializeStorage(capacity: number, config: NumberFieldDef) {
    const bytesPerElement = getBytesPerElement(config.btype);
    const buffer = new ArrayBuffer(capacity * bytesPerElement);
    const view = createTypedArray(config.btype, capacity, buffer);
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
        return array[getEntityId()];
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
        return array[getEntityId()];
      },
      set: (value: any) => {
        const array = (buffer as any)[field];
        array[getEntityId()] = value;
      },
    });
  },

  getDefaultValue(fieldDef: NumberFieldDef) {
    return fieldDef.default !== undefined ? fieldDef.default : 0;
  },

  setValue(array: any, entityId: EntityId, value: any) {
    array[entityId] = value;
  },

  growStorage(oldArray: any, newCapacity: number, config: NumberFieldDef) {
    const bytesPerElement = getBytesPerElement(config.btype);
    const newBuffer = new ArrayBuffer(newCapacity * bytesPerElement);
    const newView = createTypedArray(config.btype, newCapacity, newBuffer);
    newView.set(oldArray);
    return { buffer: newBuffer, view: newView };
  },
};

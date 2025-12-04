import type { EntityId } from "../../types";
import type { ComponentBuffer, EnumFieldDef } from "../types";
import type { Field } from "./field";

/**
 * EnumField stores enum values as indices into a sorted array of values.
 * This is more efficient than storing strings:
 * - Uses 2 bytes (Uint16) per entity, supporting up to 65536 enum values
 * - Values are sorted alphabetically for consistent ordering
 */
export const EnumField: Field = {
  initializeStorage(
    capacity: number,
    config: EnumFieldDef,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const buffer = new BufferConstructor(capacity * 2); // 2 bytes per Uint16
    const view = new Uint16Array(buffer);
    return { buffer, view };
  },

  defineReadonly(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId,
    fieldDef?: EnumFieldDef
  ) {
    // Sort values alphabetically for consistent ordering
    const sortedValues = fieldDef ? [...fieldDef.values].sort() : [];

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName] as Uint16Array;
        const index = array[getEntityId()];
        return sortedValues[index] ?? sortedValues[0] ?? "";
      },
    });
  },

  defineWritable(
    master: any,
    fieldName: string,
    buffer: ComponentBuffer<any>,
    getEntityId: () => EntityId,
    fieldDef?: EnumFieldDef
  ) {
    // Sort values alphabetically and create lookup map
    const sortedValues = fieldDef ? [...fieldDef.values].sort() : [];
    const valueToIndex = new Map<string, number>();
    sortedValues.forEach((v, i) => valueToIndex.set(v, i));

    Object.defineProperty(master, fieldName, {
      enumerable: true,
      configurable: false,
      get: () => {
        const array = (buffer as any)[fieldName] as Uint16Array;
        const index = array[getEntityId()];
        return sortedValues[index] ?? sortedValues[0] ?? "";
      },
      set: (value: string) => {
        const array = (buffer as any)[fieldName] as Uint16Array;
        const index = valueToIndex.get(value);
        if (index !== undefined) {
          array[getEntityId()] = index;
        }
      },
    });
  },

  getDefaultValue(fieldDef: EnumFieldDef) {
    // Sort values to match storage order
    const sortedValues = [...fieldDef.values].sort();

    // Return index of default value, or 0 if not specified
    if (fieldDef.default !== undefined) {
      const index = sortedValues.indexOf(fieldDef.default);
      return index >= 0 ? index : 0;
    }
    return 0;
  },

  setValue(array: Uint16Array, entityId: EntityId, value: number) {
    array[entityId] = value;
  },
};

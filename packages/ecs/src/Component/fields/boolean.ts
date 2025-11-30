import type { EntityId } from "../../World";
import type { ComponentBuffer, BooleanFieldDef } from "../types";
import type { Field } from "./field";

export const BooleanField: Field = {
  initializeStorage(
    capacity: number,
    config: BooleanFieldDef,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const buffer = new BufferConstructor(capacity);
    const view = new Uint8Array(buffer, 0, capacity);
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
        return Boolean(array[getEntityId()]);
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
        return Boolean(array[getEntityId()]);
      },
      set: (value: any) => {
        const array = (buffer as any)[field];
        array[getEntityId()] = value ? 1 : 0;
      },
    });
  },

  getDefaultValue(fieldDef: BooleanFieldDef) {
    return fieldDef.default !== undefined ? fieldDef.default : false;
  },

  setValue(array: any, entityId: EntityId, value: any) {
    array[entityId] = value ? 1 : 0;
  },

  growStorage(
    oldArray: any,
    newCapacity: number,
    config: BooleanFieldDef,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const newBuffer = new BufferConstructor(newCapacity);
    const newView = new Uint8Array(newBuffer, 0, newCapacity);
    newView.set(oldArray);
    return { buffer: newBuffer, view: newView };
  },
};

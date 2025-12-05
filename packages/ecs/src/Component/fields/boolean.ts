import type { EntityId } from "../../types";
import type { ComponentBuffer, BooleanFieldDef } from "../types";
import { Field } from "./field";

export class BooleanField extends Field<BooleanFieldDef> {
  initializeStorage(
    capacity: number,
    BufferConstructor: new (byteLength: number) => ArrayBufferLike
  ) {
    const buffer = new BufferConstructor(capacity);
    const view = new Uint8Array(buffer, 0, capacity);
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
        return Boolean(array[getEntityId()]);
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
        return Boolean(array[getEntityId()]);
      },
      set: (value: any) => {
        const array = (buffer as any)[fieldName];
        array[getEntityId()] = value ? 1 : 0;
      },
    });
  }

  getDefaultValue() {
    return this.fieldDef.default !== undefined ? this.fieldDef.default : false;
  }

  setValue(array: any, entityId: EntityId, value: any) {
    array[entityId] = value ? 1 : 0;
  }
}

import type { StringBufferView } from "./fields/string";
import type { BinaryBufferView } from "./fields/binary";
import type { ArrayBufferView } from "./fields/array";

// Field type definitions
export type FieldType = "string" | "number" | "boolean" | "binary" | "array";

export type NumberSubtype =
  | "uint8"
  | "uint16"
  | "uint32"
  | "int8"
  | "int16"
  | "int32"
  | "float32"
  | "float64";

// Schema field definitions
export interface BaseField<T> {
  type: FieldType;
  default?: T;
}

export interface StringFieldDef extends BaseField<string> {
  type: "string";
  maxLength?: number;
  default?: string;
}

export interface NumberFieldDef extends BaseField<number> {
  type: "number";
  btype: NumberSubtype;
  default?: number;
}

export interface BooleanFieldDef extends BaseField<boolean> {
  type: "boolean";
  default?: boolean;
}

export interface BinaryFieldDef extends BaseField<Uint8Array> {
  type: "binary";
  maxLength?: number;
  default?: Uint8Array;
}

export interface ArrayFieldDef<
  TElementDef extends
    | StringFieldDef
    | NumberFieldDef
    | BooleanFieldDef
    | BinaryFieldDef =
    | StringFieldDef
    | NumberFieldDef
    | BooleanFieldDef
    | BinaryFieldDef
> extends BaseField<any[]> {
  type: "array";
  elementDef: TElementDef;
  maxLength: number;
  default?: any[];
}

export type FieldDef =
  | StringFieldDef
  | NumberFieldDef
  | BooleanFieldDef
  | BinaryFieldDef
  | ArrayFieldDef;

// TypedArray union type
export type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

// Helper type to infer element type from ArrayFieldDef
type InferArrayElementType<TElementDef> = TElementDef extends StringFieldDef
  ? string
  : TElementDef extends NumberFieldDef
  ? number
  : TElementDef extends BooleanFieldDef
  ? boolean
  : TElementDef extends BinaryFieldDef
  ? Uint8Array
  : never;

// Component schema and inference types
export type ComponentSchema = Record<
  string,
  {
    def:
      | StringFieldDef
      | NumberFieldDef
      | BooleanFieldDef
      | BinaryFieldDef
      | ArrayFieldDef;
  }
>;

export type InferComponentType<T extends ComponentSchema> = {
  [K in keyof T]: T[K]["def"] extends StringFieldDef
    ? string
    : T[K]["def"] extends NumberFieldDef
    ? number
    : T[K]["def"] extends BooleanFieldDef
    ? boolean
    : T[K]["def"] extends BinaryFieldDef
    ? Uint8Array
    : T[K]["def"] extends ArrayFieldDef<infer TElementDef>
    ? InferArrayElementType<TElementDef>[]
    : never;
};

// Type for the buffer accessor that provides typed array access to component fields
export type ComponentBuffer<T extends ComponentSchema> = {
  [K in keyof T]: T[K]["def"] extends NumberFieldDef
    ? TypedArray
    : T[K]["def"] extends BooleanFieldDef
    ? Uint8Array
    : T[K]["def"] extends StringFieldDef
    ? StringBufferView
    : T[K]["def"] extends BinaryFieldDef
    ? BinaryBufferView
    : T[K]["def"] extends ArrayFieldDef
    ? ArrayBufferView
    : never;
};

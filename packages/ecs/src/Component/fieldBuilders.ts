import type {
  StringFieldDef,
  NumberFieldDef,
  BooleanFieldDef,
  BinaryFieldDef,
  ArrayFieldDef,
  NumberSubtype,
} from "./types";

/** Union type for all field builders that can be used as array elements */
export type ElementFieldBuilder =
  | StringFieldBuilder
  | NumberFieldBuilder
  | BooleanFieldBuilder
  | BinaryFieldBuilder;

// Field builder classes with fluent API
export class StringFieldBuilder {
  def: StringFieldDef = {
    type: "string",
  };

  /**
   * Set the maximum number of bytes for the string field
   * @param length - The maximum number of bytes for the string
   * @returns This builder for chaining
   */
  max(length: number): this {
    this.def.maxLength = length;
    return this;
  }

  /**
   * Set the default value for the string field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: string): this {
    this.def.default = value;
    return this;
  }
}

export class NumberFieldBuilder {
  def: NumberFieldDef;

  /**
   * Create a number field builder with the specified binary type
   * @param btype - The binary type for the number field
   */
  constructor(btype: NumberSubtype) {
    this.def = {
      type: "number",
      btype: btype,
    };
  }

  /**
   * Set the default value for the number field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: number): this {
    this.def.default = value;
    return this;
  }
}

export class BooleanFieldBuilder {
  def: BooleanFieldDef = {
    type: "boolean",
  };

  /**
   * Set the default value for the boolean field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: boolean): this {
    this.def.default = value;
    return this;
  }
}

export class BinaryFieldBuilder {
  def: BinaryFieldDef = {
    type: "binary",
  };

  /**
   * Set the maximum number of bytes for the binary field
   * @param length - The maximum number of bytes
   * @returns This builder for chaining
   */
  max(length: number): this {
    this.def.maxLength = length;
    return this;
  }

  /**
   * Set the default value for the binary field
   * @param value - The default value
   * @returns This builder for chaining
   */
  default(value: Uint8Array): this {
    this.def.default = value;
    return this;
  }
}

export class ArrayFieldBuilder<
  T extends ElementFieldBuilder = ElementFieldBuilder
> {
  def: T extends StringFieldBuilder
    ? ArrayFieldDef<StringFieldDef>
    : T extends NumberFieldBuilder
    ? ArrayFieldDef<NumberFieldDef>
    : T extends BooleanFieldBuilder
    ? ArrayFieldDef<BooleanFieldDef>
    : T extends BinaryFieldBuilder
    ? ArrayFieldDef<BinaryFieldDef>
    : ArrayFieldDef;

  /**
   * Create an array field builder with the specified element type and max length
   * @param elementBuilder - A field builder specifying the element type
   * @param maxLength - The maximum number of elements in the array
   */
  constructor(elementBuilder: T, maxLength: number) {
    this.def = {
      type: "array",
      elementDef: elementBuilder.def,
      maxLength: maxLength,
    } as any;
  }

  /**
   * Set the default value for the array field
   * @param value - The default value (array of the element type)
   * @returns This builder for chaining
   */
  default(value: any[]): this {
    this.def.default = value;
    return this;
  }
}

/**
 * Schema builder API for defining component fields
 * Provides factory functions for creating typed field builders
 */
export const field = {
  /** Create a string field builder */
  string: () => new StringFieldBuilder(),
  /** Create an unsigned 8-bit integer field builder */
  uint8: () => new NumberFieldBuilder("uint8"),
  /** Create an unsigned 16-bit integer field builder */
  uint16: () => new NumberFieldBuilder("uint16"),
  /** Create an unsigned 32-bit integer field builder */
  uint32: () => new NumberFieldBuilder("uint32"),
  /** Create a signed 8-bit integer field builder */
  int8: () => new NumberFieldBuilder("int8"),
  /** Create a signed 16-bit integer field builder */
  int16: () => new NumberFieldBuilder("int16"),
  /** Create a signed 32-bit integer field builder */
  int32: () => new NumberFieldBuilder("int32"),
  /** Create a 32-bit floating point field builder */
  float32: () => new NumberFieldBuilder("float32"),
  /** Create a 64-bit floating point field builder */
  float64: () => new NumberFieldBuilder("float64"),
  /** Create a boolean field builder */
  boolean: () => new BooleanFieldBuilder(),
  /** Create a binary field builder for Uint8Array data */
  binary: () => new BinaryFieldBuilder(),
  /**
   * Create an array field builder for fixed-length arrays of any field type
   * @param elementBuilder - A field builder specifying the element type (e.g., field.float32(), field.string().max(100))
   * @param maxLength - The maximum number of elements in the array
   * @returns An array field builder
   * @example
   * ```typescript
   * // Array of floats
   * const Polygon = defineComponent({
   *   pts: field.array(field.float32(), 1024),
   * });
   *
   * // Array of strings
   * const Tags = defineComponent({
   *   names: field.array(field.string().max(50), 10),
   * });
   *
   * // Array of booleans
   * const Flags = defineComponent({
   *   bits: field.array(field.boolean(), 32),
   * });
   * ```
   */
  array: <T extends ElementFieldBuilder>(
    elementBuilder: T,
    maxLength: number
  ) => new ArrayFieldBuilder(elementBuilder, maxLength),
};

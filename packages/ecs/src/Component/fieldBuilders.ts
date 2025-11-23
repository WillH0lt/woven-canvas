import type {
  StringFieldDef,
  NumberFieldDef,
  BooleanFieldDef,
  BinaryFieldDef,
  NumberSubtype,
} from "./types";

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
};

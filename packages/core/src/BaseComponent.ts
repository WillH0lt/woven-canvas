export { Type, field, component } from "@lastolivegames/becsy";

export abstract class BaseComponent {
  static schema: Record<string, any>;

  static persistent = true;
  static singleton = false;
  // static networked = false

  constructor(data: Record<string, any> = {}) {
    this.fromJson(data);
  }

  public toJson(): Record<string, any> {
    const data: Record<string, any> = {};

    const schema = this.getSchema();
    for (const key in schema) {
      const type = schema[key].type.constructor.name;

      if (!Object.hasOwn(schema, key)) continue;

      if (type === "VectorType") {
        // working around becsy's vector binding behavior
        // @ts-ignore
        if (this[key]) {
          // @ts-ignore
          const vec = this[key];
          const clone = new Array(vec.length);
          for (let i = 0; i < vec.length; i++) {
            clone[i] = vec[i];
          }
          data[key] = clone;
        } else {
          data[key] = schema[key].default ?? schema[key].type.default;
        }
      } else if (type === "BackrefsType" || type === "RefType") {
        // no-op
      } else {
        data[key] =
          // @ts-ignore
          this[key] ?? schema[key].default ?? schema[key].type.default;
      }
    }

    return data;
  }

  public fromJson(data: Record<string, any>): this {
    const schema = this.getSchema();
    for (const key in data) {
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        this[key] = data[key];
      }
    }

    return this;
  }

  public getSchema(): Record<string, any> {
    return (this.constructor as typeof BaseComponent).schema ?? {};
  }

  public reset(): void {
    const schema = this.getSchema();
    for (const key in schema) {
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        this[key] = schema[key].default ?? schema[key].type.default;
      }
    }
  }
}

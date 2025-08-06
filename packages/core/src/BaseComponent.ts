export { Type, field, component } from '@lastolivegames/becsy'

export abstract class BaseComponent {
  static schema: Record<string, any>

  static addToHistory = true

  constructor(data: Record<string, any> = {}) {
    this.deserialize(data)
  }

  public serialize(): Record<string, any> {
    const data: Record<string, any> = {}

    const schema = (this.constructor as typeof BaseComponent).schema ?? {}
    for (const key in schema) {
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        data[key] = this[key] ?? schema[key].default ?? schema[key].type.default
      }
    }

    return data
  }

  public deserialize(data: Record<string, any>): this {
    for (const key in data) {
      if (Object.hasOwn((this.constructor as typeof BaseComponent).schema ?? {}, key)) {
        // @ts-ignore
        this[key] = data[key]
      }
    }

    return this
  }
}

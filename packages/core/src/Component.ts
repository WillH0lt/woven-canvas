export { Type, field, component } from '@lastolivegames/becsy'

export abstract class Component {
  static schema: Record<string, any>

  static addToHistory = true

  public serialize(): Record<string, any> {
    const data: Record<string, any> = {}

    const schema = (this.constructor as typeof Component).schema ?? {}
    for (const key in schema) {
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        data[key] = this[key] ?? schema[key].default ?? schema[key].type.default
      }
    }

    return data
  }

  public deserialize(data: Record<string, any>): void {
    for (const key in data) {
      if (Object.hasOwn((this.constructor as typeof Component).schema ?? {}, key)) {
        // @ts-ignore
        this[key] = data[key]
      }
    }
  }
}

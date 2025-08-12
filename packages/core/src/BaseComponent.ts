export { Type, field, component } from '@lastolivegames/becsy'

export abstract class BaseComponent {
  static schema: Record<string, any>

  static addToHistory = true

  constructor(data: Record<string, any> = {}) {
    this.fromJson(data)
  }

  public toJson(): Record<string, any> {
    const data: Record<string, any> = {}

    const schema = this.getSchema()
    for (const key in schema) {
      const type = schema[key].type.constructor.name
      if (type === 'BackrefsType') continue
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        data[key] = this[key] ?? schema[key].default ?? schema[key].type.default
      }
    }

    return data
  }

  public fromJson(data: Record<string, any>): this {
    const schema = this.getSchema()
    for (const key in data) {
      if (Object.hasOwn(schema, key)) {
        // @ts-ignore
        this[key] = data[key]
      }
    }

    return this
  }

  public getSchema(): Record<string, any> {
    return (this.constructor as typeof BaseComponent).schema ?? {}
  }

  public isIntersecting(_point: [number, number]): boolean {
    return true
  }
}

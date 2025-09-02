import { BaseComponent } from '@infinitecanvas/core'
import { Connection } from '@infinitecanvas/core/components'
import { type Entity, Type, component, field } from '@lastolivegames/becsy'

@component
export class Arrow extends BaseComponent {
  @field.float64.vector(2) declare a: [number, number]
  @field.float64.vector(2) declare b: [number, number]
  @field.float64.vector(2) declare c: [number, number]
  // @field.dynamicString(36) declare connectionA: string
  // @field.dynamicString(36) declare connectionC: string
  // @field.boolean declare isCurved: boolean

  @field.backrefs(Connection, 'sourceEntity', true) declare connections: Entity[]
  @field.float64.vector(2) declare startConnectionUv: [number, number]
  @field.dynamicString(36) declare startConnectionBlockId: string
  @field.float64.vector(2) declare endConnectionUv: [number, number]
  @field.dynamicString(36) declare endConnectionBlockId: string

  @field({ type: Type.float32, default: 8 }) declare diameter: number
  @field.uint32 public declare seed: number

  public isCurved(): boolean {
    const { a, b, c } = this

    const det = (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1])

    return Math.abs(det) > 1e-8
  }
}

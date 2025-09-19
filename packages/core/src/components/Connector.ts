import { type Entity, component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Connector extends BaseComponent {
  // @field.dynamicString(36) declare endBlockId: string
  // @field.ref declare endBlockEntity: Entity | undefined
  // @field.float64.vector(2) declare endBlockUv: [number, number]

  // @field.dynamicString(36) declare startBlockId: string
  // @field.ref declare startBlockEntity: Entity | undefined
  // @field.float64.vector(2) declare startBlockUv: [number, number]

  @field.dynamicString(36) declare startBlockId: string
  @field.ref declare startBlockEntity: Entity | undefined
  @field.float64.vector(2) declare startBlockUv: [number, number]
  @field.float64.vector(2) declare startUv: [number, number]

  @field.dynamicString(36) declare endBlockId: string
  @field.ref declare endBlockEntity: Entity | undefined
  @field.float64.vector(2) declare endBlockUv: [number, number]
  @field.float64.vector(2) declare endUv: [number, number]
}

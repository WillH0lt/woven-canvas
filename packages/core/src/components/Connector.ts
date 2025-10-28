import { component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Connector extends BaseComponent {
  @field.dynamicString(36) declare startBlockId: string
  @field.float64.vector(2) declare startBlockUv: [number, number]
  @field.float64.vector(2) declare startUv: [number, number]
  @field.boolean declare startNeedsUpdate: boolean

  @field.dynamicString(36) declare endBlockId: string
  @field.float64.vector(2) declare endBlockUv: [number, number]
  @field.float64.vector(2) declare endUv: [number, number]
  @field.boolean declare endNeedsUpdate: boolean

  public toJson(): Record<string, any> {
    const data = super.toJson()

    delete data.startNeedsUpdate
    delete data.endNeedsUpdate
    return data
  }
}

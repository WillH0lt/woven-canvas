import { Type, component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../../../core/src/BaseComponent'

@component
export class ArrowTrim extends BaseComponent {
  static addToHistory = false

  @field.float64 declare tStart: number
  @field({ type: Type.float64, default: 1 }) declare tEnd: number
}

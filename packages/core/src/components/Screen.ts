import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Screen {
  @field({ type: Type.boolean, default: true })
  public declare resizedTrigger: boolean
}

import { Type, component, field } from '@lastolivegames/becsy'

@component
export class FloatingMenuState {
  @field({ type: Type.boolean, default: true }) public declare visible: boolean
}

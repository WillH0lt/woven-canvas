import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Tool {
  // @field({ type: Type.dynamicString(32), default: 'select' }) public declare value: string

  @field({ type: Type.dynamicString(32), default: 'select' }) public declare leftMouse: string

  @field({ type: Type.dynamicString(32), default: 'pan' }) public declare middleMouse: string

  @field({ type: Type.dynamicString(32), default: 'menu' }) public declare rightMouse: string

  @field({ type: Type.dynamicString(32), default: 'scroll' }) public declare wheel: string

  @field({ type: Type.dynamicString(32), default: 'zoom' }) public declare modWheel: string
}

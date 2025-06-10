import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Cursor {
  @field({ type: Type.dynamicString(32), default: 'selection' }) public declare mode: string
}

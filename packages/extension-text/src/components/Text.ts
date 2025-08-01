import { Type, component, field } from '@lastolivegames/becsy'

import { Component } from '../../../core/src/Component.js'

@component
export class Text extends Component {
  @field.dynamicString(1e4) public declare content: string
  @field({ type: Type.float32, default: 24 }) public declare fontSize: number
  @field.dynamicString(36) public declare fontFamily: string
  @field({ type: Type.float32, default: 1.2 }) public declare lineHeight: number
}

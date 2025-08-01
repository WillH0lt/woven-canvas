import { Type, component, field } from '@lastolivegames/becsy'

import { Component } from '../Component.js'

@component
export class Color extends Component {
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field({ type: Type.uint8, default: 255 }) declare alpha: number
}

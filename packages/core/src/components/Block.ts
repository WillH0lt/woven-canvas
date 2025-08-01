import { Type, component, field } from '@lastolivegames/becsy'
import { Component } from '../Component'
@component
export class Block extends Component {
  @field.dynamicString(36) public declare id: string
  @field({ type: Type.dynamicString(36), default: 'ic-shape' }) public declare tag: string
  @field.float32 declare top: number
  @field.float32 declare left: number
  @field.float32 declare width: number
  @field.float32 declare height: number
  @field.float32 declare rotateZ: number
  @field.dynamicString(36) public declare rank: string
  // @field.boolean public declare stretchableWidth: boolean
  // @field.boolean public declare stretchableHeight: boolean
  @field.boolean public declare hasStretched: boolean
}

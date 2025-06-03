import { component, field } from '@lastolivegames/becsy'

@component
export class Block {
  @field.dynamicString(36) public declare id: string
  @field.float32 declare top: number
  @field.float32 declare left: number
  @field.float32 declare width: number
  @field.float32 declare height: number
  @field.uint8 declare red: number
  @field.uint8 declare green: number
  @field.uint8 declare blue: number
  @field.uint8 declare alpha: number
  // @field.dynamicString(36) public declare tag: string
  // @field.dynamicString(32) public declare layer: string
  // @field.dynamicString(36) public declare rank: string
}

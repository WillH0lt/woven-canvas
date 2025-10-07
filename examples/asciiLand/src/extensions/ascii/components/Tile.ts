import { component, field } from '@lastolivegames/becsy'

@component
export class Tile {
  @field.dynamicString(36) public declare id: string
  @field.float64 public declare left: number
  @field.float64 public declare top: number
  @field.int32.vector(2) public declare index: [number, number]
}

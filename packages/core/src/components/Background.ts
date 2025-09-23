import { component, field } from '@lastolivegames/becsy'

@component
export class Background {
  @field.dynamicString(32) public declare kind: string
  @field.dynamicString(9) public declare color: string
  @field.dynamicString(9) public declare strokeColor: string
  @field.uint8 public declare subdivisionStep: number
}

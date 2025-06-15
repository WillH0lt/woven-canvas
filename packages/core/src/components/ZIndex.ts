import { component, field } from '@lastolivegames/becsy'

@component
export class ZIndex {
  @field.uint32 public declare value: number
  @field.dynamicString(36) public declare rank: string
}

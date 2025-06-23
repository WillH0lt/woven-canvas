import { component, field } from '@lastolivegames/becsy'

@component
export class Frame {
  @field.uint32 public declare value: number
}

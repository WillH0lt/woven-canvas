import { component, field } from '@lastolivegames/becsy'

@component
export class Opacity {
  @field.uint8 public declare value: number
}

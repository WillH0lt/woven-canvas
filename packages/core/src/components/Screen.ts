import { component, field } from '@lastolivegames/becsy'

@component
export class Screen {
  @field.boolean public declare resizedTrigger: boolean
  @field.float64 public declare width: number
  @field.float64 public declare height: number
}

import { component, field } from '@lastolivegames/becsy'

@component
export class Grid {
  @field.boolean public declare enabled: boolean
  @field.float64 public declare xSpacing: number
  @field.float64 public declare ySpacing: number
}

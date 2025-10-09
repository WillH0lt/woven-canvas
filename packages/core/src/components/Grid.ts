import { component, field } from '@lastolivegames/becsy'

@component
export class Grid {
  @field.boolean public declare enabled: boolean
  @field.float64 public declare colWidth: number
  @field.float64 public declare rowHeight: number
}

import { component, field } from '@lastolivegames/becsy'

@component
export class Selected {
  @field.float32 public declare startLeft: number
  @field.float32 public declare startTop: number
  @field.float32 public declare startWidth: number
  @field.float32 public declare startHeight: number
  @field.float32 public declare startRotateZ: number
}

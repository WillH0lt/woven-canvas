import { component, field } from '@lastolivegames/becsy'

@component
export class Aabb {
  @field.float32 public declare left: number
  @field.float32 public declare right: number
  @field.float32 public declare top: number
  @field.float32 public declare bottom: number
}

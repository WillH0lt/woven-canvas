import { component, field } from '@lastolivegames/becsy'

@component
export class FontSize {
  @field.float32 public declare value: number
  @field.float32 public declare lastBlockWidth: number
  @field.float32 public declare lastBlockHeight: number
}

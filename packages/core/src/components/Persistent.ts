import { component, field } from '@lastolivegames/becsy'
import type { ISerializable } from '../types'

@component
export class Persistent implements ISerializable {
  @field.dynamicString(36) public declare id: string

  public toModel(): Record<string, unknown> {
    return { id: this.id }
  }

  public fromModel(model: Record<string, unknown>): void {
    this.id = model.id as string
  }
}

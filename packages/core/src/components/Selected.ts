import { component } from '@lastolivegames/becsy'
import type { ISerializable } from '../types'

@component
export class Selected implements ISerializable<Record<string, never>> {
  public toModel(): Record<string, never> {
    return {}
  }

  public fromModel(): void {
    // No-op, as this component does not hold any data
  }
}

import { component } from '@lastolivegames/becsy'
import type { ISerializable } from '../../../core/src/types'

@component
export class SelectionBox implements ISerializable {
  public toModel(): {} {
    return {}
  }

  public fromModel(): void {
    // No-op
  }
}

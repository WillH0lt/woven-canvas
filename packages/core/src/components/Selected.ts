import { component, field } from '@lastolivegames/becsy'
import type { ISerializable } from '../types'

interface SelectedModel {
  selectedBy: string
}

@component
export class Selected implements ISerializable<SelectedModel> {
  @field.dynamicString(36) public declare selectedBy: string

  public toModel(): SelectedModel {
    return {
      selectedBy: this.selectedBy,
    }
  }

  public fromModel(model: SelectedModel): void {
    this.selectedBy = model.selectedBy
  }
}

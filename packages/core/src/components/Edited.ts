import { component, field } from '@lastolivegames/becsy'
import type { ISerializable } from '../types'

interface EditedModel {
  editedBy: string
}

@component
export class Edited implements ISerializable<EditedModel> {
  @field.dynamicString(36) public declare editedBy: string

  public toModel(): EditedModel {
    return {
      editedBy: this.editedBy,
    }
  }

  public fromModel(model: EditedModel): void {
    this.editedBy = model.editedBy
  }
}

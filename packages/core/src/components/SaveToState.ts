import { component, field } from '@lastolivegames/becsy'

@component
export class SaveToState {
  @field.dynamicString(36) public declare id: string
}

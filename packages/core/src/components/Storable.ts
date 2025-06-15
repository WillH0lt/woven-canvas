import { component, field } from '@lastolivegames/becsy'

@component
export class Storable {
  @field.dynamicString(36) public declare id: string
}

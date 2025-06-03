import { component, field } from '@lastolivegames/becsy'

@component
export class SelectionBox {
  @field.int32.vector(2) public declare start: [number, number]
}

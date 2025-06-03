import { type Entity, component, field } from '@lastolivegames/becsy'

@component
export class CommandRef {
  @field.uint8 public declare index: number
  @field.ref public declare entity: Entity
  @field.ref public declare command: Entity
}

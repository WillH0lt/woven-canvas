import { type Entity, component, field } from '@lastolivegames/becsy'

@component
export class Connection {
  @field.ref public declare sourceEntity: Entity
  @field.ref public declare targetEntity: Entity
}

import { type Entity, component, field } from '@lastolivegames/becsy'

@component
export class Intersect {
  @field.ref public declare entity: Entity | undefined
}

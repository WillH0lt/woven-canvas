import { type Entity, component, field } from '@lastolivegames/becsy'

@component
export class Intersect {
  @field.ref public declare entity: Entity | undefined
  @field.ref public declare entity2: Entity | undefined
  @field.ref public declare entity3: Entity | undefined
  @field.ref public declare entity4: Entity | undefined
  @field.ref public declare entity5: Entity | undefined
}

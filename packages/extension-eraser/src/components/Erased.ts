import { type Entity, component, field } from '@lastolivegames/becsy'

@component
export class Erased {
  @field.ref public declare eraserStroke: Entity | null
}

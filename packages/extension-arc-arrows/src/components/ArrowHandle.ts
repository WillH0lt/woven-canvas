import { type Entity, component, field } from '@lastolivegames/becsy'

import { ArrowHandleKind } from '../types.js'

@component
export class ArrowHandle {
  @field.staticString(Object.values(ArrowHandleKind)) public declare kind: ArrowHandleKind
  @field.ref public declare arrowEntity: Entity | null
}

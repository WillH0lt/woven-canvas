import type { Entity } from '@lastolivegames/becsy'
import { component, field } from '@lastolivegames/becsy'

import { TransformHandleKind } from '../types.js'

@component
export class TransformHandle {
  @field.staticString(Object.values(TransformHandleKind)) public declare kind: TransformHandleKind
  @field.uint8.vector(2) public declare vector: [number, number]
  @field.ref public declare transformBox: Entity
}

import { type Entity, Type, component, field } from '@lastolivegames/becsy'

import { CursorKind, TransformHandleKind } from '../types.js'

@component
export class TransformHandle {
  @field.staticString(Object.values(TransformHandleKind)) public declare kind: TransformHandleKind
  @field.int8.vector(2) public declare vector: [number, number]
  @field.ref public declare transformBox: Entity
  @field({ type: Type.staticString(Object.values(CursorKind)), default: CursorKind.Drag })
  public declare cursorKind: CursorKind
}

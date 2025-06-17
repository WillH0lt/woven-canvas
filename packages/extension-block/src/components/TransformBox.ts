import { type Entity, component, field } from '@lastolivegames/becsy'
import { TransformHandle } from './TransformHandle'

@component
export class TransformBox {
  @field.backrefs(TransformHandle) public declare handles: Entity[]
}

import { type Entity, component, field } from '@lastolivegames/becsy'
import { TransformHandle } from './TransformHandle'

@component
export class TransformBox {
  @field.float32 public declare startLeft: number
  @field.float32 public declare startTop: number
  @field.float32 public declare startWidth: number
  @field.float32 public declare startHeight: number
  @field.float32 public declare startRotateZ: number
  @field.backrefs(TransformHandle) public declare handles: Entity[]
}

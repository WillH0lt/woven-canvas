import { type Entity, Type, component, field } from '@lastolivegames/becsy'

import { BaseComponent } from '../BaseComponent'

@component
export class CameraState extends BaseComponent {
  static persistent = false
  static singleton = true

  @field({ type: Type.boolean, default: true }) public declare canSeeBlocks: boolean
  @field.ref public declare seenBlock: Entity | null
}

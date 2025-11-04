import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

import TransformHandle from './TransformHandle.js';

@component
class TransformBox {
  @field.boolean declare public pointerHasBeenReleasedAtLeastOnce: boolean;

  @field.float64 declare public startLeft: number;

  @field.float64 declare public startTop: number;

  @field.float64 declare public startWidth: number;

  @field.float64 declare public startHeight: number;

  @field.backrefs(TransformHandle, 'transformBox', true) declare public handles: Entity[];
}

export default TransformBox;

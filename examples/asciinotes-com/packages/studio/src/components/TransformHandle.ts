import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

import { TransformHandleKind } from '../types.js';

@component
class TransformHandle {
  @field.staticString(Object.values(TransformHandleKind)) public declare kind: TransformHandleKind;

  @field.ref public declare transformBox: Entity;
}

export default TransformHandle;

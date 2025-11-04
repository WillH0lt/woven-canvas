import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

import { RailKind } from '../types.js';

@component
class RailHandle {
  @field.staticString(Object.values(RailKind)) public declare kind: RailKind;

  @field.ref public declare rail: Entity;
}

export default RailHandle;

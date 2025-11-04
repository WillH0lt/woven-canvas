import { component, field } from '@lastolivegames/becsy';

import { RailKind } from '../types.js';

@component
class Rail {
  @field.staticString(Object.values(RailKind)) declare public kind: RailKind;
}

export default Rail;

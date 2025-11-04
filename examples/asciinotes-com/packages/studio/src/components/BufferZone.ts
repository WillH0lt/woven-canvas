import { component, field } from '@lastolivegames/becsy';

import { BufferZoneKind } from '../types.js';

@component
class BufferZone {
  @field.staticString(Object.values(BufferZoneKind)) public declare kind: BufferZoneKind;
}

export default BufferZone;

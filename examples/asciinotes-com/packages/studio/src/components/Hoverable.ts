import { component, field, Type } from '@lastolivegames/becsy';

import { CursorKind } from '../types.js';

@component
class Hoverable {
  @field({ type: Type.staticString(Object.values(CursorKind)), default: CursorKind.Auto })
  public declare cursorKind: CursorKind;
}

export default Hoverable;

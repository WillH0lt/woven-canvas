import { component, field, Type } from '@lastolivegames/becsy';
import type { Part } from '@prisma/client';
import { CursorKind } from '../types.js';

@component
class Cursor {
  @field.object declare public heldBlock: Part | null;

  @field({ type: Type.staticString(Object.values(CursorKind)), default: CursorKind.Auto })
  declare public cursorKind: CursorKind;
}

export default Cursor;

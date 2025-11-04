import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

import Effect from './Effect.js';
import Part from './Part.js';

@component
class Group {
  @field.dynamicString(36) declare public id: string;

  @field.backrefs(Effect, 'group', true) declare public effects: Entity[];

  @field.backrefs(Part, 'group', true) declare public parts: Entity[];

  // ununsed fields
  @field.dynamicString(36) declare public pageId: string;

  @field.dynamicString(128) declare public createdBy: string;

  @field.dynamicString(128) declare public createdAt: string;

  @field.dynamicString(128) declare public updatedAt: string;
}

export default Group;

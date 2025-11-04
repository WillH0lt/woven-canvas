import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

@component
class UndoRedoState {
  @field.boolean declare public inInnerEdit: boolean;

  @field.ref declare public innerEditStart: Entity | null;
  // @field.dynamicString(128) declare public innerEditStart: string;
}

export default UndoRedoState;

import type { Entity } from '@lastolivegames/becsy';
import { component, field } from '@lastolivegames/becsy';

@component
class Ghost {
  @field.ref declare public part: Entity | null;
}

export default Ghost;

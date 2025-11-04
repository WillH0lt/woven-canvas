import { component, field } from '@lastolivegames/becsy';

@component
class Snapshot {
  @field.dynamicString(128) declare public url: string;
}

export default Snapshot;

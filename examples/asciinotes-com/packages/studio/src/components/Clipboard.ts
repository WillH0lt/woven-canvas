import { component, field } from '@lastolivegames/becsy';

@component
class Clipboard {
  @field.dynamicString(128) public declare url: string;
}

export default Clipboard;

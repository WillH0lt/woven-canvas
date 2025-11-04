import { component, field } from '@lastolivegames/becsy';

@component
class Rank {
  @field.dynamicString(36) public declare value: string;
}

export default Rank;

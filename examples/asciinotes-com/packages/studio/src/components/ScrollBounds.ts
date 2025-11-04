import { component, field } from '@lastolivegames/becsy';

@component
class ScrollBounds {
  @field.float64 declare public max: number;

  @field.float64 declare public worldSize: number;
}

export default ScrollBounds;

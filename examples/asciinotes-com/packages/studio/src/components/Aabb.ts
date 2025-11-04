import { component, field } from '@lastolivegames/becsy';

@component
class Aabb {
  @field.float64.vector(4) public declare value: [number, number, number, number];
}

export default Aabb;

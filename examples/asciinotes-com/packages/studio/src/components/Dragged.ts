import { component, field } from '@lastolivegames/becsy';

@component
class Dragged {
  @field.int32.vector(2) public declare grabOffset: [number, number];

  @field.int32 public declare startLeft: number;

  @field.int32 public declare startTop: number;
}

export default Dragged;

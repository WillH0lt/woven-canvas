import { component, field, Type } from '@lastolivegames/becsy';

@component
class View {
  @field.float64 declare public target: number;

  @field.float64 declare public velocity: number;

  @field.float64 declare public current: number;

  @field.float64 declare public previous: number;

  @field({ type: Type.float64, default: 0.1 }) declare public smoothTime: number;

  @field({ type: Type.float64, default: 10_000 }) declare public maxSpeed: number;

  @field.boolean declare public bufferEnd: boolean;

  @field.boolean declare public offcenter: boolean;
}

export default View;

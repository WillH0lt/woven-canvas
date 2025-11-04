import { component, field, Type } from '@lastolivegames/becsy';

@component
class ViewportScale {
  @field.boolean declare public relativeUnits: boolean;

  @field({ type: Type.float64, default: 1 }) declare public value: number;

  @field.float64 declare public worldScreenHeight: number;

  @field.float64 declare public worldScreenWidth: number;
}

export default ViewportScale;

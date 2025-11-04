import { component, field } from '@lastolivegames/becsy';

@component
class Selected {
  @field.float64 declare public startLeft: number;

  @field.float64 declare public startTop: number;

  @field.float64 declare public startWidth: number;

  @field.float64 declare public startHeight: number;

  @field.float64 declare public startFontSize: number;
}

export default Selected;

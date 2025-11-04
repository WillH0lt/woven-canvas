import { component, field, Type } from '@lastolivegames/becsy';

@component
class SiteLimits {
  @field({ type: Type.float32, default: 1e6 }) declare public partsCount: number;
}

export default SiteLimits;

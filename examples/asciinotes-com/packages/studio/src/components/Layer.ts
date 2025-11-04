import { component, field } from '@lastolivegames/becsy';

import { LayerKind } from '../types.js';

@component
class Layer {
  @field.staticString(Object.values(LayerKind)) declare public kind: LayerKind;

  @field.float64 declare public opacity: number;

  @field.boolean declare public active: boolean;
}

export default Layer;

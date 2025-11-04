import { component, field } from '@lastolivegames/becsy';

import { SnapLineKind } from '../types.js';

@component
class SnapLine {
  @field.staticString(Object.values(SnapLineKind)) public declare kind: SnapLineKind;
}

export default SnapLine;

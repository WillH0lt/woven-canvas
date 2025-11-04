import { component, field } from '@lastolivegames/becsy';

import { PointerAction, WheelAction } from '../types.js';

@component
class InputMode {
  @field.staticString(Object.values(PointerAction)) public declare actionLeftMouse: PointerAction;

  @field.staticString(Object.values(PointerAction))
  public declare actionMiddleMouse: PointerAction;

  @field.staticString(Object.values(PointerAction))
  public declare actionRightMouse: PointerAction;

  @field.staticString(Object.values(WheelAction)) public declare actionWheel: WheelAction;

  @field.staticString(Object.values(WheelAction)) public declare actionModWheel: WheelAction;
}

export default InputMode;

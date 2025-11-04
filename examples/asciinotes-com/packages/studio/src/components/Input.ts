import { component, field, Type } from '@lastolivegames/becsy';

import { PointerAction } from '../types.js';

@component
class Input {
  @field.int32.vector(2) declare public pointerScreen: [number, number];

  @field.int32.vector(2) declare public pointer: [number, number];

  @field.int32.vector(2) declare public pointerDownLocation: [number, number];

  // @field.dynamicString(12) declare public pointerKind: string;

  @field.staticString(Object.values(PointerAction)) declare public pointerAction: PointerAction;

  @field({ type: Type.boolean, default: true }) declare public pointerOver: boolean;

  @field.boolean declare public isClickedTrigger: boolean;

  @field.int32 declare public deltaY: number;

  @field.int32 declare public _deltaYRequest: number;

  @field.float64 declare public travelDistance: number;

  @field.boolean declare public isDragging: boolean;

  @field.boolean declare public dragStartTrigger: boolean;

  @field.boolean declare public dragStopTrigger: boolean;

  @field.boolean declare public pointerDown: boolean;

  @field.boolean declare public pointerDownTrigger: boolean;

  @field.boolean declare public pointerUpTrigger: boolean;

  @field.boolean declare public doubleClickTrigger: boolean;

  @field({ type: Type.boolean, default: true }) declare public resizedTrigger: boolean;

  // @field.boolean public declare aDown: boolean;

  // @field.boolean public declare aDownTrigger: boolean;

  // @field.boolean public declare aUpTrigger: boolean;

  // @field.boolean public declare bDown: boolean;

  // @field.boolean public declare bDownTrigger: boolean;

  // @field.boolean public declare bUpTrigger: boolean;

  @field.boolean declare public cDown: boolean;

  @field.boolean declare public cDownTrigger: boolean;

  @field.boolean declare public cUpTrigger: boolean;

  // @field.boolean public declare dDown: boolean;

  // @field.boolean public declare dDownTrigger: boolean;

  // @field.boolean public declare dUpTrigger: boolean;

  // @field.boolean public declare eDown: boolean;

  // @field.boolean public declare eDownTrigger: boolean;

  // @field.boolean public declare eUpTrigger: boolean;

  // @field.boolean public declare fDown: boolean;

  // @field.boolean public declare fDownTrigger: boolean;

  // @field.boolean public declare fUpTrigger: boolean;

  // @field.boolean public declare gDown: boolean;

  // @field.boolean public declare gDownTrigger: boolean;

  // @field.boolean public declare gUpTrigger: boolean;

  // @field.boolean public declare hDown: boolean;

  // @field.boolean public declare hDownTrigger: boolean;

  // @field.boolean public declare hUpTrigger: boolean;

  // @field.boolean public declare iDown: boolean;

  // @field.boolean public declare iDownTrigger: boolean;

  // @field.boolean public declare iUpTrigger: boolean;

  // @field.boolean public declare jDown: boolean;

  // @field.boolean public declare jDownTrigger: boolean;

  // @field.boolean public declare jUpTrigger: boolean;

  // @field.boolean public declare kDown: boolean;

  // @field.boolean public declare kDownTrigger: boolean;

  // @field.boolean public declare kUpTrigger: boolean;

  // @field.boolean public declare lDown: boolean;

  // @field.boolean public declare lDownTrigger: boolean;

  // @field.boolean public declare lUpTrigger: boolean;

  // @field.boolean public declare mDown: boolean;

  // @field.boolean public declare mDownTrigger: boolean;

  // @field.boolean public declare mUpTrigger: boolean;

  // @field.boolean public declare nDown: boolean;

  // @field.boolean public declare nDownTrigger: boolean;

  // @field.boolean public declare nUpTrigger: boolean;

  // @field.boolean public declare oDown: boolean;

  // @field.boolean public declare oDownTrigger: boolean;

  // @field.boolean public declare oUpTrigger: boolean;

  // @field.boolean public declare pDown: boolean;

  // @field.boolean public declare pDownTrigger: boolean;

  // @field.boolean public declare pUpTrigger: boolean;

  // @field.boolean public declare qDown: boolean;

  // @field.boolean public declare qDownTrigger: boolean;

  // @field.boolean public declare qUpTrigger: boolean;

  // @field.boolean public declare rDown: boolean;

  // @field.boolean public declare rDownTrigger: boolean;

  // @field.boolean public declare rUpTrigger: boolean;

  // @field.boolean public declare sDown: boolean;

  // @field.boolean public declare sDownTrigger: boolean;

  // @field.boolean public declare sUpTrigger: boolean;

  // @field.boolean public declare tDown: boolean;

  // @field.boolean public declare tDownTrigger: boolean;

  // @field.boolean public declare tUpTrigger: boolean;

  // @field.boolean public declare uDown: boolean;

  // @field.boolean public declare uDownTrigger: boolean;

  // @field.boolean public declare uUpTrigger: boolean;

  @field.boolean declare public vDown: boolean;

  @field.boolean declare public vDownTrigger: boolean;

  @field.boolean declare public vUpTrigger: boolean;

  // @field.boolean public declare wDown: boolean;

  // @field.boolean public declare wDownTrigger: boolean;

  // @field.boolean public declare wUpTrigger: boolean;

  @field.boolean declare public xDown: boolean;

  @field.boolean declare public xDownTrigger: boolean;

  @field.boolean declare public xUpTrigger: boolean;

  @field.boolean declare public yDown: boolean;

  @field.boolean declare public yDownTrigger: boolean;

  @field.boolean declare public yUpTrigger: boolean;

  @field.boolean declare public zDown: boolean;

  @field.boolean declare public zDownTrigger: boolean;

  @field.boolean declare public zUpTrigger: boolean;

  // @field.boolean public declare oneDown: boolean;

  // @field.boolean public declare oneDownTrigger: boolean;

  // @field.boolean public declare oneUpTrigger: boolean;

  // @field.boolean public declare twoDown: boolean;

  // @field.boolean public declare twoDownTrigger: boolean;

  // @field.boolean public declare twoUpTrigger: boolean;

  // @field.boolean public declare threeDown: boolean;

  // @field.boolean public declare threeDownTrigger: boolean;

  // @field.boolean public declare threeUpTrigger: boolean;

  // @field.boolean public declare fourDown: boolean;

  // @field.boolean public declare fourDownTrigger: boolean;

  // @field.boolean public declare fourUpTrigger: boolean;

  // @field.boolean public declare fiveDown: boolean;

  // @field.boolean public declare fiveDownTrigger: boolean;

  // @field.boolean public declare fiveUpTrigger: boolean;

  // @field.boolean public declare sixDown: boolean;

  // @field.boolean public declare sixDownTrigger: boolean;

  // @field.boolean public declare sixUpTrigger: boolean;

  // @field.boolean public declare sevenDown: boolean;

  // @field.boolean public declare sevenDownTrigger: boolean;

  // @field.boolean public declare sevenUpTrigger: boolean;

  // @field.boolean public declare eightDown: boolean;

  // @field.boolean public declare eightDownTrigger: boolean;

  // @field.boolean public declare eightUpTrigger: boolean;

  // @field.boolean public declare nineDown: boolean;

  // @field.boolean public declare nineDownTrigger: boolean;

  // @field.boolean public declare nineUpTrigger: boolean;

  // @field.boolean public declare zeroDown: boolean;

  // @field.boolean public declare zeroDownTrigger: boolean;

  // @field.boolean public declare zeroUpTrigger: boolean;

  // @field.boolean public declare minusDown: boolean;

  // @field.boolean public declare minusDownTrigger: boolean;

  // @field.boolean public declare minusUpTrigger: boolean;

  // @field.boolean public declare plusDown: boolean;

  // @field.boolean public declare plusDownTrigger: boolean;

  // @field.boolean public declare plusUpTrigger: boolean;

  // @field.boolean public declare backspaceDown: boolean;

  // @field.boolean public declare backspaceDownTrigger: boolean;

  // @field.boolean public declare backspaceUpTrigger: boolean;

  // @field.boolean public declare enterDown: boolean;

  // @field.boolean public declare enterDownTrigger: boolean;

  // @field.boolean public declare enterUpTrigger: boolean;

  // @field.boolean public declare spaceDown: boolean;

  // @field.boolean public declare spaceDownTrigger: boolean;

  // @field.boolean public declare spaceUpTrigger: boolean;

  // @field.boolean public declare tabDown: boolean;

  // @field.boolean public declare tabDownTrigger: boolean;

  // @field.boolean public declare tabUpTrigger: boolean;

  @field.boolean declare public escapeDown: boolean;

  @field.boolean declare public escapeDownTrigger: boolean;

  @field.boolean declare public escapeUpTrigger: boolean;

  @field.boolean declare public shiftDown: boolean;

  @field.boolean declare public shiftDownTrigger: boolean;

  @field.boolean declare public shiftUpTrigger: boolean;

  @field.boolean declare public modDown: boolean;

  @field.boolean declare public modDownTrigger: boolean;

  @field.boolean declare public modUpTrigger: boolean;

  @field.boolean declare public deleteDown: boolean;

  @field.boolean declare public deleteDownTrigger: boolean;

  @field.boolean declare public deleteUpTrigger: boolean;

  // @field.boolean public declare arrowleftDown: boolean;

  // @field.boolean public declare arrowleftDownTrigger: boolean;

  // @field.boolean public declare arrowleftUpTrigger: boolean;

  // @field.boolean public declare arrowrightDown: boolean;

  // @field.boolean public declare arrowrightDownTrigger: boolean;

  // @field.boolean public declare arrowrightUpTrigger: boolean;

  // @field.boolean public declare arrowupDown: boolean;

  // @field.boolean public declare arrowupDownTrigger: boolean;

  // @field.boolean public declare arrowupUpTrigger: boolean;

  // @field.boolean public declare arrowdownDown: boolean;

  // @field.boolean public declare arrowdownDownTrigger: boolean;

  // @field.boolean public declare arrowdownUpTrigger: boolean;
}

export default Input;

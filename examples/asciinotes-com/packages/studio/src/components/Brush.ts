import { component, field, Type } from '@lastolivegames/becsy';
import type { BrushKinds } from '@scrolly-page/brushes';

@component
class Brush {
  @field.uint8 public declare kind: BrushKinds;

  @field.uint8 public declare red: number;

  @field.uint8 public declare green: number;

  @field.uint8 public declare blue: number;

  @field.uint8 public declare alpha: number;

  @field({ type: Type.uint16, default: 25 }) public declare size: number;
}

export default Brush;

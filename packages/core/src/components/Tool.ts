import { Type, component, field } from '@lastolivegames/becsy'
import { PointerButton } from '../types'

@component
export class Tool {
  // @field({ type: Type.dynamicString(32), default: 'select' }) public declare value: string

  @field({ type: Type.dynamicString(32), default: 'select' }) public declare leftMouse: string

  @field({ type: Type.dynamicString(32), default: 'pan' }) public declare middleMouse: string

  @field({ type: Type.dynamicString(32), default: 'menu' }) public declare rightMouse: string

  @field({ type: Type.dynamicString(32), default: 'scroll' }) public declare wheel: string

  @field({ type: Type.dynamicString(32), default: 'zoom' }) public declare modWheel: string

  getButton(tool: string): PointerButton | null {
    if (this.leftMouse === tool) {
      return PointerButton.Left
    }
    if (this.middleMouse === tool) {
      return PointerButton.Middle
    }
    if (this.rightMouse === tool) {
      return PointerButton.Right
    }

    return null
  }

  wheelActive(tool: string, modDown: boolean): boolean {
    return (this.wheel === tool && !modDown) || (this.modWheel === tool && modDown)
  }
}

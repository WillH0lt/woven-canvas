import { Type, component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'
import { PointerButton } from '../types'

@component
export class Controls extends BaseComponent {
  @field({ type: Type.dynamicString(32), default: 'select' }) public declare leftMouseTool: string

  @field({ type: Type.dynamicString(32), default: 'hand' }) public declare middleMouseTool: string

  @field({ type: Type.dynamicString(32), default: 'menu' }) public declare rightMouseTool: string

  @field({ type: Type.dynamicString(32), default: 'scroll' }) public declare wheelTool: string

  @field({ type: Type.dynamicString(32), default: 'zoom' }) public declare modWheelTool: string

  @field.dynamicString(4048) public declare heldSnapshot: string

  getButtons(...tools: string[]): PointerButton[] {
    const buttons: PointerButton[] = []
    if (tools.includes(this.leftMouseTool)) {
      buttons.push(PointerButton.Left)
    }
    if (tools.includes(this.middleMouseTool)) {
      buttons.push(PointerButton.Middle)
    }
    if (tools.includes(this.rightMouseTool)) {
      buttons.push(PointerButton.Right)
    }

    return buttons
  }

  wheelActive(tool: string, modDown: boolean): boolean {
    return (this.wheelTool === tool && !modDown) || (this.modWheelTool === tool && modDown)
  }
}

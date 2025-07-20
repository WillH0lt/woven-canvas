import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { getCursorSvg } from '../helpers'
import { CoreCommand, type CoreCommandArgs, type CursorIcon } from '../types'
import { UpdateCamera } from './UpdateCamera'

export class UpdateCursor extends BaseSystem<CoreCommandArgs> {
  // private readonly cursors = this.query((q) => q.current.with(comps.Cursor).write)

  private readonly tools = this.query((q) => q.current.with(comps.Tool).write)

  // TODO: Schedule after UpdateTransformBox when both systems are available
  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetTool, this.setTool.bind(this))
    this.addCommandListener(CoreCommand.SetCursor, this.setCursor.bind(this))
  }

  private setTool(payload: { tool: string }): void {
    const tool = this.tools.current[0].write(comps.Tool)
    tool.leftMouse = payload.tool
  }

  private setCursor(payload: { icon: CursorIcon; rotateZ: number }): void {
    // TODO rotate the rotation cursor,
    // this should maybe be done in a computed store watcher instead of this system
    const svg = getCursorSvg(payload.icon, payload.rotateZ)
    document.body.style.cursor = svg
  }

  public execute(): void {
    this.executeCommands()

    // Update the cursor based on the current tool and icon
    // const cursor = this.cursors.current[0].write(comps.Cursor)
    // applyCursorIcon(cursor.icon, cursor.rotateZ)

    // Emit the cursor update command
    // this.emitCommand(CoreCommand.UpdateCursor, cursor.icon, cursor.rotateZ)
  }
}

import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { getCursorSvg } from '../helpers'
import { BlockCommand, type BlockCommandArgs, type CursorIcon } from '../types'
import { UpdateCamera } from './UpdateCamera'

export class UpdateCursor extends BaseSystem<BlockCommandArgs> {
  // private readonly cursors = this.query((q) => q.current.with(comps.Cursor).write)

  private readonly tools = this.query((q) => q.current.with(comps.Tool).write)

  // TODO: Schedule after UpdateTransformBox when both systems are available
  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(BlockCommand.SetTool, this.setTool.bind(this))
    this.addCommandListener(BlockCommand.SetCursor, this.setCursor.bind(this))
  }

  private setTool(value: string): void {
    const tool = this.tools.current[0].write(comps.Tool)
    tool.leftMouse = value
  }

  private setCursor(icon: CursorIcon, rotateZ = 0): void {
    // TODO rotate the rotation cursor,
    // this should maybe be done in a computed store watcher instead of this system
    const svg = getCursorSvg(icon, rotateZ)
    document.body.style.cursor = svg
  }

  public execute(): void {
    this.executeCommands()

    // Update the cursor based on the current tool and icon
    // const cursor = this.cursors.current[0].write(comps.Cursor)
    // applyCursorIcon(cursor.icon, cursor.rotateZ)

    // Emit the cursor update command
    // this.emitCommand(BlockCommand.UpdateCursor, cursor.icon, cursor.rotateZ)
  }
}

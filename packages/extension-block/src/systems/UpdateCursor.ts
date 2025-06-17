import { BaseSystem, type CursorIcon } from '@infinitecanvas/core'
import { getCursorSvg } from '../helpers'
import { BlockCommand, type BlockCommandArgs } from '../types'
import { UpdateSelection } from './UpdateSelection'
import { UpdateTransformBox } from './UpdateTransformBox'

export class UpdateCursor extends BaseSystem<BlockCommandArgs> {
  // private readonly cursors = this.query((q) => q.current.with(comps.Cursor).write)

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection, UpdateTransformBox))
  }

  public initialize(): void {
    // this.addCommandListener(BlockCommand.SetTool, this.setTool.bind(this))
    this.addCommandListener(BlockCommand.SetCursor, this.SetCursor.bind(this))
  }

  // private setTool(tool: Tool, block: Partial<BlockModel>): void {
  //   // const cursor = this.cursors.current[0].write(comps.Cursor)
  //   // cursor.tool = tool
  //   // if (tool === Tool.AddBlock) {
  //   // }
  // }

  private SetCursor(icon: CursorIcon, rotateZ = 0): void {
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

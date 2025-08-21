import { BaseSystem } from '../BaseSystem'
import * as comps from '../components'
import { setCursorSvg } from '../helpers'
import { CoreCommand, type CoreCommandArgs, CursorIcon } from '../types'
import { UpdateCamera } from './UpdateCamera'

export class UpdateCursor extends BaseSystem<CoreCommandArgs> {
  private readonly controlsQuery = this.query((q) => q.current.with(comps.Controls).write)

  private readonly hovered = this.query((q) => q.added.current.removed.with(comps.Block, comps.Hovered))

  private readonly controls = this.singleton.read(comps.Controls)

  private readonly intersects = this.query((q) => q.changed.current.with(comps.Intersect).trackWrites)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetControls, this.setControls.bind(this))
    // this.addCommandListener(CoreCommand.SetCursor, this.setCursor.bind(this))

    setCursorSvg(CursorIcon.Select)
  }

  private setControls(tool: Partial<comps.Controls>): void {
    const currentControls = this.controlsQuery.current[0].write(comps.Controls)
    Object.assign(currentControls, tool)

    // handle tool update
    let cursorIcon = CursorIcon.Crosshair
    if (currentControls.leftMouseTool === 'select') {
      cursorIcon = CursorIcon.Select
    } else if (currentControls.leftMouseTool === 'hand') {
      cursorIcon = CursorIcon.Hand
    }

    setCursorSvg(cursorIcon)
    this.emitCommand(CoreCommand.DeselectAll)
  }

  // private setCursor(payload: { icon: CursorIcon; rotateZ: number }): void {
  //   // TODO rotate the rotation cursor,
  //   // this should maybe be done in a computed store watcher instead of this system
  //   const svg = getCursorSvg(payload.icon, payload.rotateZ)
  //   document.body.style.cursor = svg
  // }
}

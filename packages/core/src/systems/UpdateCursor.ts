import { BaseSystem } from '../BaseSystem'
import { CoreCommand, type CoreCommandArgs } from '../commands'
import * as comps from '../components'
import { CROSSHAIR_CURSOR } from '../constants'
import type { CoreResources } from '../types'
import { UpdateCamera } from './UpdateCamera'

function setDocumentCursor(cursorSvg: string) {
  // TODO maybe use block container instead
  document.body.style.cursor = cursorSvg
}

export class UpdateCursor extends BaseSystem<CoreCommandArgs> {
  protected readonly resources!: CoreResources

  private readonly controlsQuery = this.query((q) => q.current.changed.with(comps.Controls).write.trackWrites)

  private readonly cursorQuery = this.query((q) => q.current.with(comps.Cursor).write)

  // let becsy know that cursor is a singleton
  private readonly _cursor = this.singleton.read(comps.Cursor)

  public constructor() {
    super()
    this.schedule((s) => s.inAnyOrderWith(UpdateCamera))
  }

  public initialize(): void {
    this.addCommandListener(CoreCommand.SetControls, this.setControls.bind(this))
    this.addCommandListener(CoreCommand.SetCursor, this.setCursor.bind(this))
  }

  public execute(): void {
    if (this.frame.value === 1) {
      // triggers cursor to update on first frame
      this.setControls({})
    }

    for (const controlsEntity of this.controlsQuery.changed) {
      const controls = controlsEntity.read(comps.Controls)
      const toolDef = this.getTool(controls.leftMouseTool)
      const cursorIcon = toolDef?.cursorIcon || CROSSHAIR_CURSOR
      this.setCursor({ svg: cursorIcon })
    }

    this.executeCommands()
  }

  private setControls(controls: Partial<comps.Controls>): void {
    const currentControls = this.controlsQuery.current[0].write(comps.Controls)
    Object.assign(currentControls, controls)

    // if (currentControls.leftMouseTool !== 'select') {
    //   this.emitCommand(CoreCommand.DeselectAll)
    // }
  }

  private setCursor(cursor: Partial<comps.Cursor>): void {
    const currentCursor = this.cursorQuery.current[0].write(comps.Cursor)
    Object.assign(currentCursor, cursor)

    const toolCursor = this.getTool(this.controls.leftMouseTool)?.cursorIcon

    const svg = currentCursor.contextSvg || toolCursor || CROSSHAIR_CURSOR
    setDocumentCursor(svg)
  }
}

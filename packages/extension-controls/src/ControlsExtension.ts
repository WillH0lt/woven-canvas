import { Extension } from '@infinitecanvas/core'
import type { ICommands, Resources, SendCommandFn } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import { ControlCommand, type ControlCommandArgs } from './types'

import * as sys from './systems'

declare module '@infinitecanvas/core' {
  interface ICommands {
    controls: {
      moveCamera: (x: number, y: number) => void
      setZoom: (zoom: number) => void
    }
  }
}

export class ControlsExtension extends Extension {
  public async initialize(resources: Resources): Promise<void> {
    this._captureGroup = System.group(sys.CaptureZoom, { resources })

    this._updateGroup = System.group(sys.UpdateCamera, { resources })

    // this._inputGroup = System.group(
    //   sys.InputScreen,
    //   { resources },
    //   sys.InputPointer,
    //   { resources },
    //   sys.InputKeyboard,
    //   { resources },
    // )
  }

  public addCommands = (send: SendCommandFn<ControlCommandArgs>): Partial<ICommands> => {
    return {
      controls: {
        moveCamera: (x: number, y: number) => send(ControlCommand.MoveCamera, x, y),
        setZoom: (zoom: number) => send(ControlCommand.SetZoom, zoom),
      },
    }
  }
}

import { Extension } from '@infinitecanvas/core'
import type { ICommands, Resources, SendCommandFn } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import { ControlCommand, type ControlCommandArgs, ControlOptions, type ControlResources } from './types'

import * as sys from './systems'

declare module '@infinitecanvas/core' {
  interface ICommands {
    controls: {
      removeSelected: () => void
    }
  }
}

export class ControlsExtension extends Extension {
  private readonly options: ControlOptions

  constructor(options: ControlOptions = {}) {
    super()
    this.options = ControlOptions.parse(options)
  }

  public async initialize(resources: Resources): Promise<void> {
    const r: ControlResources = {
      ...resources,
      controlOptions: this.options,
    }

    this._captureGroup = System.group(
      sys.CaptureZoom,
      { resources: r },
      sys.CaptureScroll,
      { resources: r },
      sys.CaptureDrag,
      { resources: r },
      sys.CaptureSelect,
      { resources: r },
      sys.CaptureTransformBox,
      { resources: r },
    )

    this._updateGroup = System.group(sys.UpdateSelection, { resources: r }, sys.UpdateTransformBox, { resources: r })
  }

  public addCommands = (send: SendCommandFn<ControlCommandArgs>): Partial<ICommands> => {
    return {
      controls: {
        removeSelected: () => send(ControlCommand.RemoveSelected),
      },
    }
  }
}

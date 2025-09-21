import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'
import * as sys from './systems'
import { ControlsOptions, type ControlsOptionsInput, type ControlsResources } from './types'

class ControlsExtensionClass extends BaseExtension {
  private options: ControlsOptions

  constructor(options: ControlsOptionsInput = {}) {
    super()
    this.options = ControlsOptions.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const controlsResources: ControlsResources = {
      ...resources,
      ...this.options,
    }

    this.captureGroup = this.createGroup(
      controlsResources,
      sys.CaptureZoom,
      sys.CaptureScroll,
      sys.CapturePan,
      sys.CaptureScrollEdges,
    )
  }
}

export const ControlsExtension = (options: ControlsOptionsInput = {}) => new ControlsExtensionClass(options)

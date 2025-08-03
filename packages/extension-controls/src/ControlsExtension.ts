import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import * as sys from './systems'

class ControlsExtensionClass extends BaseExtension {
  public async preBuild(resources: BaseResources): Promise<void> {
    this._captureGroup = this.createGroup(resources, sys.CaptureZoom, sys.CaptureScroll, sys.CapturePan)
  }
}

export const ControlsExtension = () => new ControlsExtensionClass()

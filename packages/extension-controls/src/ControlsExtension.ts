import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import * as sys from './systems'

export class ControlsExtension extends BaseExtension {
  public name = 'controls'

  public async preBuild(resources: BaseResources): Promise<void> {
    this._captureGroup = System.group(
      sys.CaptureZoom,
      { resources },
      sys.CaptureScroll,
      { resources },
      sys.CapturePan,
      { resources },
    )
  }
}

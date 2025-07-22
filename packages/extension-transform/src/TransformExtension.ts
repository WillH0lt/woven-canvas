import { BaseExtension } from '@infinitecanvas/core'
import type { Resources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'

export class TransformExtension extends BaseExtension {
  public name = 'transform'

  public async preBuild(resources: Resources): Promise<void> {
    this._captureGroup = System.group(sys.CaptureSelect, { resources }, sys.CaptureTransformBox, { resources })

    this._updateGroup = System.group(sys.UpdateSelection, { resources }, sys.UpdateTransformBox, { resources })
  }
}

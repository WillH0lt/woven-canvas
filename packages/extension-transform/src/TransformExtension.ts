import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import * as sys from './systems'

class TransformExtensionClass extends BaseExtension {
  public async preBuild(resources: BaseResources): Promise<void> {
    this._captureGroup = System.group(sys.CaptureSelect, { resources }, sys.CaptureTransformBox, { resources })

    this._updateGroup = System.group(sys.UpdateSelection, { resources }, sys.UpdateTransformBox, { resources })
  }
}

export const TransformExtension = () => new TransformExtensionClass()

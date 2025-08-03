import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'

import * as sys from './systems'
import './elements'
import { TransformOptions, type TransformResources } from './types'

class TransformExtensionClass extends BaseExtension {
  constructor(public options: TransformOptions = {}) {
    super()
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const transformResources: TransformResources = {
      ...resources,
      ...TransformOptions.parse(this.options),
    }

    this._captureGroup = this.createGroup(transformResources, sys.CaptureSelect, sys.CaptureTransformBox)
    this._updateGroup = this.createGroup(transformResources, sys.UpdateSelection, sys.UpdateTransformBox)
  }
}

export const TransformExtension = (options: TransformOptions = {}) => new TransformExtensionClass(options)

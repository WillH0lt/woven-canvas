import { BaseExtension } from '@infinitecanvas/core'
import type { BaseResources } from '@infinitecanvas/core'

import * as sys from './systems'
import './webComponents'
import { TransformOptions, type TransformOptionsInput, type TransformResources } from './types'

class TransformExtensionClass extends BaseExtension {
  private options: TransformOptions

  constructor(options: TransformOptionsInput = {}) {
    super()
    this.options = TransformOptions.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const transformResources: TransformResources = {
      ...resources,
      ...this.options,
    }

    this._captureGroup = this.createGroup(
      transformResources,
      sys.CaptureSelect,
      sys.CaptureTransformBox,
      sys.CaptureHoverCursor,
    )
    this._updateGroup = this.createGroup(transformResources, sys.UpdateSelection, sys.UpdateTransformBox)
  }
}

export const TransformExtension = (options: TransformOptionsInput = {}) => new TransformExtensionClass(options)

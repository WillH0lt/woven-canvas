import { BaseExtension } from '@infinitecanvas/core'
import type { Resources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import { ControlOptions, type ControlResources } from './types'
import './elements'
import * as sys from './systems'

export class ControlsExtension extends BaseExtension {
  public name = 'controls'

  private readonly options: ControlOptions

  constructor(options: ControlOptions = {}) {
    super()
    this.options = ControlOptions.parse(options)
  }

  public async preBuild(resources: Resources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.transformOrigin = '0 0'
    // establish a stacking context
    viewport.style.transform = 'translate(0, 0) scale(1)'
    viewport.style.position = 'relative'

    resources.domElement.appendChild(viewport)

    const r: ControlResources = {
      ...resources,
      controlOptions: this.options,
      viewport,
    }

    this._captureGroup = System.group(
      sys.CaptureZoom,
      { resources: r },
      sys.CaptureScroll,
      { resources: r },
      sys.CapturePan,
      { resources: r },
      sys.CaptureSelect,
      { resources: r },
      sys.CaptureTransformBox,
      { resources: r },
    )

    // this._preUpdateGroup = System.group(sys.PreUpdateSelection, { resources: r }, sys.PreUpdateTransformBox, {
    //   resources: r,
    // })

    this._updateGroup = System.group(sys.UpdateSelection, { resources: r }, sys.UpdateTransformBox, { resources: r })

    this._preRenderGroup = System.group(sys.PreRenderOverlay, { resources: r })
  }
}

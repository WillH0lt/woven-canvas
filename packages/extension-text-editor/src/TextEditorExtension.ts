import { BaseExtension } from '@infinitecanvas/core'
import type { Resources } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import type { TextEditorResources } from './types'
import './elements'
import * as sys from './systems'

export class TextEditorExtension extends BaseExtension {
  public name = 'text-editor'

  public async preBuild(resources: Resources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.transformOrigin = '0 0'
    // establish a stacking context
    viewport.style.transform = 'translate(0, 0) scale(1)'
    viewport.style.position = 'relative'

    resources.domElement.appendChild(viewport)

    const r: TextEditorResources = {
      ...resources,
      viewport,
    }

    this._preCaptureGroup = System.group(sys.PreCaptureHandleText, { resources: r })

    this._updateGroup = System.group(sys.UpdateText, { resources: r })

    this._preRenderGroup = System.group(sys.PreRenderOverlay, { resources: r })
  }
}

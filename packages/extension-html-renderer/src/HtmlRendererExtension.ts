import type { Resources } from '@infinitecanvas/core'
import { Extension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import './elements'
import * as sys from './systems/index'
import type { HtmlRendererResources } from './types'

export class HtmlRendererExtension extends Extension {
  public async preBuild(resources: Resources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.pointerEvents = 'none'
    viewport.style.userSelect = 'none'
    resources.domElement.prepend(viewport)

    const r: HtmlRendererResources = {
      ...resources,
      viewport,
    }

    const group = System.group(sys.RenderHtml, {
      resources: r,
    })

    this._renderGroup = group
  }
}

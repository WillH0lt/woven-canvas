import type { Resources } from '@infinitecanvas/core'
import { BaseExtension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import type { z } from 'zod'

import './elements'
import * as sys from './systems/index'
import { FloatingMenusOptions, type FloatingMenusResources } from './types'

export class FloatingMenusExtension extends BaseExtension {
  public name = 'floating-menus'

  private readonly options: z.infer<typeof FloatingMenusOptions>

  constructor(options: z.input<typeof FloatingMenusOptions> = {}) {
    super()
    this.options = FloatingMenusOptions.parse(options)
  }

  public async preBuild(resources: Resources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.pointerEvents = 'none'
    viewport.style.userSelect = 'none'
    viewport.style.transformOrigin = '0 0'
    // establish a stacking context
    viewport.style.transform = 'translate(0, 0) scale(1)'
    viewport.style.position = 'relative'
    resources.domElement.append(viewport)

    const r: FloatingMenusResources = {
      ...resources,
      viewport,
      options: this.options,
    }

    const group = System.group(sys.PreRenderFloatingMenus, {
      resources: r,
    })

    this._renderGroup = group
  }
}

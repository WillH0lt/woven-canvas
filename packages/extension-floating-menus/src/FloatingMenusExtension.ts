import type { BaseResources } from '@infinitecanvas/core'
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

    const { theme } = this.options
    const style = document.documentElement.style
    style.setProperty('--ic-floating-menus-gray-100', theme.gray100)
    style.setProperty('--ic-floating-menus-gray-200', theme.gray200)
    style.setProperty('--ic-floating-menus-gray-300', theme.gray300)
    style.setProperty('--ic-floating-menus-gray-400', theme.gray400)
    style.setProperty('--ic-floating-menus-gray-500', theme.gray500)
    style.setProperty('--ic-floating-menus-gray-600', theme.gray600)
    style.setProperty('--ic-floating-menus-gray-700', theme.gray700)
    style.setProperty('--ic-floating-menus-primary-color', theme.primaryColor)

    style.setProperty('--ic-floating-menus-border-radius', theme.borderRadius)
    style.setProperty('--ic-floating-menus-tooltip-border-radius', theme.tooltipBorderRadius)
    style.setProperty('--ic-floating-menus-transition-duration', theme.transitionDuration)
    style.setProperty('--ic-floating-menus-transition-timing-function', theme.transitionTimingFunction)
  }

  public async preBuild(baseResources: BaseResources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.pointerEvents = 'none'
    viewport.style.userSelect = 'none'
    viewport.style.transformOrigin = '0 0'
    // establish a stacking context
    viewport.style.transform = 'translate(0, 0) scale(1)'
    viewport.style.position = 'relative'
    baseResources.domElement.append(viewport)

    const resources: FloatingMenusResources = {
      ...baseResources,
      viewport,
      options: this.options,
    }

    this._renderGroup = System.group(sys.PreRenderFloatingMenus, {
      resources,
    })
  }
}

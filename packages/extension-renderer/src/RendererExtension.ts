import type { Resources } from '@infinitecanvas/core'
import { Extension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import { Application } from 'pixi.js'

import * as sys from './systems/index.js'

export class RendererExtension extends Extension {
  public _pixiApp: Application | null = null

  public async initialize(resources: Resources): Promise<void> {
    const app = new Application()

    await app.init({
      autoStart: false,
      backgroundAlpha: 0,
      premultipliedAlpha: true,
      width: resources.domElement.clientWidth,
      height: resources.domElement.clientHeight,
      preference: 'webgpu',
    })

    app.renderer.canvas.removeAttribute('width')
    app.renderer.canvas.removeAttribute('height')
    app.renderer.canvas.style.position = 'absolute'
    app.renderer.canvas.style.width = '100%'
    app.renderer.canvas.style.height = '100%'

    resources.domElement.append(app.renderer.canvas)

    const group = System.group(sys.RenderPixi, {
      resources: {
        ...resources,
        pixiApp: app as Application,
      },
    })

    this._renderGroup = group
    this._pixiApp = app
  }
}

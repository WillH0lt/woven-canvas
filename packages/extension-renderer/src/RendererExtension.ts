import type { Resources } from '@infinitecanvas/core'
import { Extension } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import { Application, Assets, Container } from 'pixi.js'

import * as sys from './systems/index.js'

export class RendererExtension extends Extension {
  public async preBuild(resources: Resources): Promise<void> {
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

    const viewport = new Container()
    app.stage.addChild(viewport)

    resources.domElement.prepend(app.renderer.canvas)

    // await Assets.load('./Figtree.fnt')

    await Assets.addBundle('fonts', [{ alias: 'Figtree', src: './Figtree.ttf' }])

    const group = System.group(sys.RenderPixi, {
      resources: {
        ...resources,
        app,
        viewport,
      },
    })

    this._renderGroup = group
  }
}

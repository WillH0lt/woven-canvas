import {
  BaseExtension,
  type BaseResources,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
  textEditorFloatingMenuButtons,
} from '@infinitecanvas/core'
import { Application, Container } from 'pixi.js'

import { Shape } from './components'
import * as sys from './systems'
import './webComponents'

class AsciiExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-shape',
      // canEdit: true,
      resizeMode: 'free' as const,
      floatingMenu: [floatingMenuButtonColor, floatingMenuDivider, ...floatingMenuStandardButtons],
      editedFloatingMenu: textEditorFloatingMenuButtons,
      components: [Shape],
    },
  ]

  public readonly tools = [
    {
      name: 'shape',
      buttonTag: 'ic-shapes-tool',
      buttonTooltip: 'Shape',
    },
  ]

  public async preBuild(resources: BaseResources): Promise<void> {
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
    app.renderer.canvas.style.pointerEvents = 'none'

    const viewport = new Container()
    app.stage.addChild(viewport)

    resources.domElement.prepend(app.renderer.canvas)

    // await Assets.load('./Figtree.fnt')

    // await Assets.addBundle('fonts', [{ alias: 'Figtree', src: './Figtree.ttf' }])

    const asciiResources = { ...resources, app, viewport }

    this._renderGroup = this.createGroup(asciiResources, sys.RenderPixi)

    // const group = System.group(sys.RenderPixi, {
    //   resources: {
    //     ...resources,
    //     app,
    //     viewport,
    //   },
    // })
  }
}

export const AsciiExtension = () => new AsciiExtensionClass()

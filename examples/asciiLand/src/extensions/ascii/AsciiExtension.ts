import {
  BaseExtension,
  type BaseResources,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
  textEditorFloatingMenuButtons,
} from '@infinitecanvas/core'
import { OrthographicCamera, Scene, TextureLoader } from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { Shape } from './components'
import * as sys from './systems'
import { type AsciiResources, type Assets, FontData, type FontDataInput } from './types'
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
      canRotate: false,
    },
  ]

  public readonly tools = [
    {
      name: 'shape',
      buttonTag: 'ic-shapes-tool',
      buttonTooltip: 'Shape',
    },
  ]

  public readonly fontData: FontData

  constructor(fontData: FontDataInput) {
    super()
    this.fontData = FontData.parse(fontData)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const renderer = new WebGPURenderer({
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0xffffff, 0)
    const camera = new OrthographicCamera()
    const scene = new Scene()

    const assets = await this.loadAssets()
    await renderer.init()

    renderer.domElement.removeAttribute('width')
    renderer.domElement.removeAttribute('height')
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.userSelect = 'none'
    renderer.domElement.style.overflow = 'hidden'

    resources.domElement.prepend(renderer.domElement)

    const asciiResources: AsciiResources = {
      ...resources,
      renderer,
      camera,
      scene,
      assets,
      fontData: this.fontData,
    }

    this.preRenderGroup = this.createGroup(asciiResources, sys.PreRenderPrepareScene)

    this.renderGroup = this.createGroup(asciiResources, sys.RenderText, sys.RenderShapes, sys.RenderScene)
  }

  private async loadAssets(): Promise<Assets> {
    const textureLoader = new TextureLoader()

    const [fontAtlas, unicodeMapRecord] = await Promise.all([
      textureLoader.loadAsync(this.fontData.atlasPath),
      fetch(this.fontData.unicodeMapPath).then((res) => res.json()),
    ])

    return {
      fontAtlas,
      unicodeMap: new Map(Object.entries(unicodeMapRecord).map(([key, value]) => [Number(key), Number(value)])),
    }
  }
}

export const AsciiExtension = (fontData: FontDataInput) => new AsciiExtensionClass(fontData)

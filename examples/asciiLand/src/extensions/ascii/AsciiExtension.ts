import {
  BaseExtension,
  type BaseResources,
  type IConfig,
  floatingMenuFontSizeButton,
  floatingMenuTextAlignmentButton,
  floatingMenuTextColorButton,
} from '@infinitecanvas/core'
import { Color, Text } from '@infinitecanvas/core/components'
import { OrthographicCamera, Scene, TextureLoader, Color as ThreeColor } from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { Shape } from './components'
import * as sys from './systems'
import { type AsciiFont, type AsciiResources, type Assets, FontData, type FontDataInput } from './types'
import './webComponents'

declare module '@infinitecanvas/core' {
  interface IConfig {
    ascii: {
      fonts: AsciiFont[]
    }
  }
}

class AsciiExtensionClass extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ascii-shape',
      editOptions: {
        canEdit: false,
      },
      resizeMode: 'free' as const,
      components: [Shape, Color],
      canRotate: false,
      noHtml: true,
    },
  ]

  public readonly tools = [
    {
      name: 'shape',
      buttonTag: 'ic-shapes-tool',
      buttonTooltip: 'Shape',
    },
  ]

  public override readonly floatingMenus = [
    {
      component: Text,
      buttons: [
        {
          tag: 'ic-font-family-button',
          width: 90,
          tooltip: 'Font Family',
          menu: 'ascii-font-family-menu',
        },
        floatingMenuFontSizeButton,
        floatingMenuTextColorButton,
        floatingMenuTextAlignmentButton,
      ],
      orderIndex: 70,
    },
  ]

  public readonly fontData: FontData
  public readonly asciiFonts: AsciiFont[]

  constructor(fontData: FontDataInput, asciiFonts: AsciiFont[]) {
    super()
    this.fontData = FontData.parse(fontData)
    this.asciiFonts = asciiFonts
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const renderer = new WebGPURenderer({
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(new ThreeColor(this.fontData.backgroundColor), 1)
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

    this.updateGroup = this.createGroup(asciiResources, sys.UpdateEnforceGrid, sys.UpdateArrows)

    this.preRenderGroup = this.createGroup(asciiResources, sys.PreRenderPrepareScene)

    this.renderGroup = this.createGroup(
      asciiResources,
      sys.RenderText,
      sys.RenderShapes,
      sys.RenderScene,
      sys.RenderArrows,
    )
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

  public addConfig = (): Partial<IConfig> => {
    return {
      ascii: {
        fonts: this.asciiFonts,
      },
    }
  }
}

export const AsciiExtension = (fontData: FontDataInput, asciiFonts: AsciiFont[]) =>
  new AsciiExtensionClass(fontData, asciiFonts)

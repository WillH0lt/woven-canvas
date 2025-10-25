import {
  BaseExtension,
  type BaseResources,
  type ICommands,
  type IConfig,
  type IStore,
  type SendCommandFn,
  type State,
} from '@infinitecanvas/core'
import { Color, Selected, Text } from '@infinitecanvas/core/components'
import { type ReadonlySignal, computed } from '@lit-labs/preact-signals'
import { OrthographicCamera, Scene, TextureLoader, Color as ThreeColor } from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { Shape } from './components'
import * as sys from './systems'
import {
  AsciiCommand,
  type AsciiCommandArgs,
  type AsciiFont,
  type AsciiResources,
  type Assets,
  Options,
  type OptionsInput,
  type ShapeStyle,
} from './types'
import './webComponents'

declare module '@infinitecanvas/core' {
  interface ICommands {
    ascii: {
      applyShapeStyleToSelected: (style: string) => void
    }
  }

  interface IStore {
    ascii: {
      selectedShapes: ReadonlySignal<Shape[]>
    }
  }

  interface IConfig {
    ascii: {
      asciiFonts: AsciiFont[]
      shapeStyles: ShapeStyle[]
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
      buttonTooltip: 'Box',
      orderIndex: 10,
    },
  ]

  public override readonly floatingMenus = [
    {
      component: Text,
      buttons: [
        {
          tag: 'ic-font-family-button',
          width: 140,
          tooltip: 'Font Family',
          menu: 'ascii-font-family-menu',
        },
      ],
      orderIndex: 70,
    },
    {
      component: Shape,
      buttons: [
        {
          tag: 'ascii-shape-style-button',
          width: 100,
          tooltip: 'Style',
          menu: 'ascii-shape-style-menu',
        },
      ],
      orderIndex: 70,
    },
  ]

  public readonly options: Options

  constructor(options: OptionsInput) {
    super()
    this.options = Options.parse(options)
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    const renderer = new WebGPURenderer({
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(new ThreeColor(this.options.fontData.backgroundColor), 1)
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
      ...this.options,
      renderer,
      camera,
      scene,
      assets,
    }

    this.updateGroup = this.createGroup(asciiResources, sys.UpdateEnforceGrid, sys.UpdateCopyText, sys.UpdateShapes)

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
      textureLoader.loadAsync(this.options.fontData.atlasPath),
      fetch(this.options.fontData.unicodeMapPath).then((res) => res.json()),
    ])

    return {
      fontAtlas,
      unicodeMap: new Map(Object.entries(unicodeMapRecord).map(([key, value]) => [Number(key), Number(value)])),
    }
  }

  public addCommands = (state: State, send: SendCommandFn<AsciiCommandArgs>): Partial<ICommands> => {
    return {
      ascii: {
        applyShapeStyleToSelected: (style: string) => send(AsciiCommand.ApplyShapeStyleToSelected, style),
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      ascii: {
        selectedShapes: computed(() => {
          const selected = state.getComponents(Selected).value
          const ids = Object.keys(selected)

          const shapes: Shape[] = []

          for (const id of ids) {
            const shape = state.getComponent<Shape>(Shape, id)
            if (shape?.value) {
              shapes.push(shape.value)
            }
          }

          return shapes
        }),
      },
    }
  }

  public addConfig = (): Partial<IConfig> => {
    return {
      ascii: {
        asciiFonts: this.options.asciiFonts,
        shapeStyles: this.options.shapeStyles,
      },
    }
  }
}

export const AsciiExtension = (options: OptionsInput) => new AsciiExtensionClass(options)

import {
  BaseExtension,
  type BaseResources,
  floatingMenuButtonColor,
  floatingMenuDivider,
  floatingMenuStandardButtons,
  textEditorFloatingMenuButtons,
} from '@infinitecanvas/core'
import { AmbientLight, OrthographicCamera, Scene, TextureLoader } from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { Shape } from './components'
import * as sys from './systems'
import type { AsciiResources, Assets } from './types'
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
    const renderer = new WebGPURenderer({
      antialias: true,
      requiredLimits: {
        maxUniformBufferBindingSize: 65536,
      },
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x999999, 1)
    const camera = new OrthographicCamera()
    const scene = new Scene()

    // Add lighting for MeshStandardNodeMaterial
    const light = new AmbientLight(0xffffff, 1)
    scene.add(light)

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
    }

    this.updateGroup = this.createGroup(asciiResources, sys.UpdateTiles)

    this.renderGroup = this.createGroup(asciiResources, sys.RenderScene, sys.RenderShapes)
  }

  private async loadAssets(): Promise<Assets> {
    const textureLoader = new TextureLoader()

    const [fontAtlas] = await Promise.all([textureLoader.loadAsync('./fonts/courierPrime/atlas.png')])

    return {
      fontAtlas,
    }
  }
}

export const AsciiExtension = () => new AsciiExtensionClass()

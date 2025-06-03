import type { Resources } from '@infinitecanvas/core'
import type { Application } from 'pixi.js'

export interface RendererResources extends Resources {
  pixiApp: Application
}

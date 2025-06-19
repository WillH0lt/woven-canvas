import type { Resources } from '@infinitecanvas/core'
import type { Application, Container } from 'pixi.js'

export interface RendererResources extends Resources {
  app: Application
  viewport: Container
}

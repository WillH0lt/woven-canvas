import type { BaseResources } from '@infinitecanvas/core'
import type { Application, Container } from 'pixi.js'

export enum ShapeKind {
  Rectangle = 'rectangle',
}

export enum ShapeStrokeKind {
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
  None = 'none',
}

export enum ShapeFillKind {
  Solid = 'solid',
  None = 'none',
}

export type AsciiResources = BaseResources & {
  app: Application
  viewport: Container
}

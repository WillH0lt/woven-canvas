import type { BaseResources } from '@infinitecanvas/core'
import { type OrthographicCamera, type Scene, Texture } from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { z } from 'zod/v4'

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

export type Assets = {
  fontAtlas: Texture
}

export type AsciiResources = BaseResources & {
  renderer: WebGPURenderer
  camera: OrthographicCamera
  scene: Scene
  assets: Assets
}

export const TileMaterialOptions = z.object({
  clearColor: z.uint32(),
  atlas: z.instanceof(Texture),
  tileGrid: z.tuple([z.number().int().min(1), z.number().int().min(1)]).readonly(),
  atlasGrid: z.tuple([z.number().int().min(1), z.number().int().min(1)]).readonly(),
  atlasCellSize: z.tuple([z.number().int().min(1), z.number().int().min(1)]).readonly(),
  clearCharIndex: z.number().int().min(0),
})

export type TileMaterialOptionsInput = z.input<typeof TileMaterialOptions>

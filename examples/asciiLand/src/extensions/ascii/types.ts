import type { BaseResources } from '@infinitecanvas/core'
import type { OrthographicCamera, Scene, Texture } from 'three'
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
  unicodeMap: Map<number, number>
}

export type AsciiResources = BaseResources & {
  renderer: WebGPURenderer
  camera: OrthographicCamera
  scene: Scene
  assets: Assets
  fontData: FontData
}

export const FontData = z.object({
  clearColor: z.uint32(),
  atlasPath: z.string(),
  atlasGrid: z.tuple([z.number().int().min(1), z.number().int().min(1)]).readonly(),
  atlasCellSize: z.tuple([z.number().int().min(1), z.number().int().min(1)]).readonly(),
  lineSpacing: z.number().min(0),
  charAdvance: z.number().min(0),
  charShiftLeft: z.number().min(0),
  charShiftTop: z.number().min(0),
  unicodeMapPath: z.string(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

export type FontDataInput = z.input<typeof FontData>
export type FontData = z.infer<typeof FontData>

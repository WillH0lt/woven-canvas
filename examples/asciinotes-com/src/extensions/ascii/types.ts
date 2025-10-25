import type { BaseResources } from '@infinitecanvas/core'
import type { OrthographicCamera, Scene, Texture } from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { z } from 'zod/v4'

export type Assets = {
  fontAtlas: Texture
  unicodeMap: Map<number, number>
}

export const AsciiFont = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  lineHeight: z.number(),
})

export type AsciiFont = z.infer<typeof AsciiFont>

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

export const ShapeStyle = z.object({
  displayName: z.string(),
  key: z.string(),
  horizontalChar: z.string().min(1).max(1).default('-'),
  verticalChar: z.string().min(1).max(1).default('|'),
  topLeftCornerChar: z.string().min(1).max(1).default('+'),
  topRightCornerChar: z.string().min(1).max(1).default('+'),
  bottomLeftCornerChar: z.string().min(1).max(1).default('+'),
  bottomRightCornerChar: z.string().min(1).max(1).default('+'),
})

export type ShapeStyle = z.infer<typeof ShapeStyle>

export const Options = z.object({
  fontData: FontData,
  asciiFonts: z.array(AsciiFont).default([]),
  shapeStyles: z.array(ShapeStyle).default([]),
})

export type Options = z.infer<typeof Options>

export type OptionsInput = z.input<typeof Options>

export type AsciiResources = BaseResources &
  Options & {
    renderer: WebGPURenderer
    camera: OrthographicCamera
    scene: Scene
    assets: Assets
  }

export enum AsciiCommand {
  ApplyShapeStyleToSelected = 'asciiApplyShapeStyleToSelected',
}

export type AsciiCommandArgs = {
  [AsciiCommand.ApplyShapeStyleToSelected]: [string]
}

import type { Color as ColorComp } from '@infinitecanvas/core/components'
import {
  type ShaderNodeObject,
  add,
  clamp,
  div,
  float,
  fract,
  fwidth,
  max,
  min,
  mix,
  mod,
  mul,
  sub,
  texture,
  uint,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl'
import {
  Color,
  DataTexture,
  NodeMaterial,
  RGBAFormat,
  RedIntegerFormat,
  type Texture,
  type UniformNode,
  UnsignedIntType,
  Vector2,
} from 'three/webgpu'

import type { FontData } from '../types'

export class LetterMaterial extends NodeMaterial {
  public readonly grid: ShaderNodeObject<UniformNode<Vector2>>
  public atlas: ShaderNodeObject<UniformNode<Texture>>
  public chars: ShaderNodeObject<UniformNode<DataTexture>>
  public colors: ShaderNodeObject<UniformNode<DataTexture>>
  public atlasGrid: ShaderNodeObject<UniformNode<Vector2>>
  public atlasCellSize: ShaderNodeObject<UniformNode<Vector2>>
  public atlasSize: ShaderNodeObject<UniformNode<Vector2>>
  public lineSpacing: ShaderNodeObject<UniformNode<number>>
  public charAdvance: ShaderNodeObject<UniformNode<number>>
  public backgroundColor: ShaderNodeObject<UniformNode<Color>>
  public selected: ShaderNodeObject<UniformNode<boolean>>
  public hovered: ShaderNodeObject<UniformNode<boolean>>

  public fontData: FontData
  public unicodeMap: Map<number, number>

  constructor(fontData: FontData, atlas: Texture, unicodeMap: Map<number, number>, rows: number, cols: number) {
    super()

    this.fontData = fontData
    this.unicodeMap = unicodeMap
    this.transparent = true

    atlas.generateMipmaps = false
    this.atlas = uniform(atlas)

    this.chars = uniform<DataTexture>(
      new DataTexture(new Uint32Array(cols * rows), cols, rows, RedIntegerFormat, UnsignedIntType),
    )
    this.colors = uniform<DataTexture>(new DataTexture(new Uint8Array(4 * cols * rows), cols, rows, RGBAFormat))

    this.grid = uniform(new Vector2(cols, rows), 'uvec2')
    this.atlasGrid = uniform(new Vector2().fromArray(fontData.atlasGrid), 'uvec2')
    this.atlasCellSize = uniform(new Vector2().fromArray(fontData.atlasCellSize), 'uvec2')
    this.atlasSize = uniform(new Vector2(atlas.width, atlas.height), 'uvec2')
    this.lineSpacing = uniform(fontData.lineSpacing, 'float')
    this.charAdvance = uniform(fontData.charAdvance, 'float')
    this.backgroundColor = uniform(new Color(fontData.backgroundColor), 'color')
    this.selected = uniform(false, 'bool')
    this.hovered = uniform(false, 'bool')

    const median = (r: any, g: any, b: any) => max(min(r, g), min(max(r, g), b))

    const vuv = uv()

    const scaledUv = mul(vec2(vuv.x, sub(1.0, vuv.y)), div(vec2(this.grid), vec2(cols, rows)))
    const charIndex = uint(texture(this.chars.value, scaledUv).r)

    const atlasCol = float(mod(charIndex, this.atlasGrid.x))
    const atlasRow = float(div(charIndex, this.atlasGrid.x))

    // Calculate UV bounds for this character in the atlas
    const x1 = div(mul(atlasCol, this.atlasCellSize.x), this.atlasSize.x)
    const y1 = sub(1.0, div(mul(add(atlasRow, 1), this.atlasCellSize.y), this.atlasSize.y))
    const x2 = div(mul(add(atlasCol, 1), this.atlasCellSize.x), this.atlasSize.x)
    const y2 = sub(1.0, div(mul(atlasRow, this.atlasCellSize.y), this.atlasSize.y))

    // Map local UV within tile (fractional part) to atlas cell UV bounds
    const local = fract(mul(vuv, this.grid))

    // Calculate horizontal advance offset (centered)
    const dx = sub(x2, x1)
    const originX = mul(dx, fontData.originX)
    const advanceWidth = mul(dx, this.charAdvance.value)

    // Calculate vertical advance offset (for line spacing)
    const dy = sub(y2, y1)
    const originY = mul(dy, sub(1.0, this.lineSpacing.value), 0.5)
    const lineHeight = mul(dy, this.lineSpacing.value)

    const atlasUV = vec2(add(x1, originX, mul(local.x, advanceWidth)), add(y1, originY, mul(local.y, lineHeight)))

    const s = texture(this.atlas.value, atlasUV)

    const sigDist = sub(median(s.r, s.g, s.b), 0.5)
    const alpha = clamp(add(div(sigDist, fwidth(sigDist)), 0.5), 0.0, 1.0)

    const textColor = texture(this.colors.value, scaledUv)

    this.colorNode = mix(vec4(this.backgroundColor, textColor.a), textColor, alpha)
  }

  public setCharAtPosition(char: string, row: number, col: number): void {
    const chars = this.chars.value
    const data = chars.image.data

    const mappedChar = this.unicodeMap.get(char.charCodeAt(0)) || 0

    const index = row * this.chars.value.image.width + col
    data[index] = mappedChar

    chars.needsUpdate = true
  }

  public setColorAtPosition(color: ColorComp, row: number, col: number): void {
    const colors = this.colors.value
    const data = colors.image.data

    const index = 4 * (row * this.colors.value.image.width + col)
    data[index + 0] = color.red
    data[index + 1] = color.green
    data[index + 2] = color.blue
    data[index + 3] = color.alpha

    colors.needsUpdate = true
  }

  public uvToColRow(uv: [number, number]): [number, number] {
    const row = Math.floor(uv[1] * (this.grid.value.y - 1))
    const col = Math.floor(uv[0] * (this.grid.value.x - 1))
    return [col, row]
  }

  public setCharAtUv(char: string, uv: [number, number]): void {
    const [col, row] = this.uvToColRow(uv)
    this.setCharAtPosition(char, row, col)
  }

  public setColorAtUv(color: ColorComp, uv: [number, number]): void {
    const [col, row] = this.uvToColRow(uv)
    this.setColorAtPosition(color, row, col)
  }
}

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
  or,
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
  RedIntegerFormat,
  type Texture,
  type UniformNode,
  UnsignedIntType,
  Vector2,
} from 'three/webgpu'

import type { FontData } from '../types'

export class LetterMaterial extends NodeMaterial {
  public grid: ShaderNodeObject<UniformNode<Vector2>>
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

  constructor(fontData: FontData, atlas: Texture) {
    super()

    this.transparent = false

    this.atlas = uniform(atlas)

    const size = 64

    this.chars = uniform<DataTexture>(
      new DataTexture(new Uint32Array(size ** 2), size, size, RedIntegerFormat, UnsignedIntType),
    )
    this.colors = uniform<DataTexture>(new DataTexture(new Uint32Array(size ** 2), size, size))

    this.grid = uniform(new Vector2(), 'vec2')
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

    const scaledUv = mul(vec2(vuv.x, sub(1.0, vuv.y)), div(this.grid, vec2(size)))
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
    const advanceOffset = mul(dx, sub(1.0, this.charAdvance.value), 0.5)
    const advanceWidth = mul(dx, this.charAdvance.value)

    // Calculate vertical advance offset (for line spacing)
    const dy = sub(y2, y1)
    const lineOffset = mul(dy, sub(1.0, this.lineSpacing.value), 0.5)
    const lineHeight = mul(dy, this.lineSpacing.value)

    const atlasUV = vec2(
      add(x1, advanceOffset, mul(local.x, advanceWidth)),
      add(y1, lineOffset, mul(local.y, lineHeight)),
    )

    const s = texture(this.atlas.value, atlasUV)

    const sigDist = sub(median(s.r, s.g, s.b), 0.5)
    const alpha = clamp(add(div(sigDist, fwidth(sigDist)), 0.5), 0.0, 1.0)

    const textColor = texture(this.colors.value, scaledUv)

    // const color = 0x000000ff
    // const r = div(float(mod(shiftRight(color, 24), 256)), 255.0)
    // const g = div(float(mod(shiftRight(color, 16), 256)), 255.0)
    // const b = div(float(mod(shiftRight(color, 8), 256)), 255.0)
    // const a = div(float(mod(color, 256)), 255.0)

    // const textColor = vec4(r, g, b, a)

    const finalColor = mix(vec4(this.backgroundColor, 1.0), textColor, alpha)

    // highlight
    const uStrokeOutsetWidth = float(0.4)

    const sigDistOutset = add(sigDist, mul(uStrokeOutsetWidth, 0.5))

    const outset = clamp(add(div(sigDistOutset, fwidth(sigDistOutset)), 0.5), 0.0, 1.0)

    const highlighted = or(this.hovered, this.selected)

    // const highlightColor = vec4(div(106, 255), div(88, 255), div(242, 255), 1.0)
    // const highlightColor = vec4(0.0, 0.0, 0.0, 1.0)

    this.colorNode = mix(finalColor, textColor, mul(outset, highlighted))

    // this.colorNode = vec4(0.0, 1.0, 0.0, finalColor.a)

    // const gridUv = mul(vuv, this.grid)
    // const gridUvFract = fract(gridUv)
    // const edgeDist = min(min(gridUvFract.x, sub(1.0, gridUvFract.x)), min(gridUvFract.y, sub(1.0, gridUvFract.y)))
    // const edgeAlpha = clamp(mul(4.0, edgeDist), 0.0, 1.0)

    // this.colorNode = mix(this.colorNode, vec4(1.0, 1.0, 0.0, 1.0), mul(edgeAlpha, this.highlighted))
    // this.opacityNode = this.colorNode.w
  }
}

import {
  type ShaderNodeObject,
  add,
  clamp,
  div,
  float,
  floor,
  fwidth,
  max,
  min,
  mod,
  mul,
  shiftRight,
  sub,
  texture,
  uint,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec4,
} from 'three/tsl'
import { NodeMaterial, type Texture, type UniformArrayNode, type UniformNode, Vector2 } from 'three/webgpu'

import { TileMaterialOptions, type TileMaterialOptionsInput } from '../types'

export class TileMaterial extends NodeMaterial {
  public atlas: ShaderNodeObject<UniformNode<Texture>>
  public chars: ShaderNodeObject<UniformArrayNode>
  public colors: ShaderNodeObject<UniformArrayNode>
  public tileGrid: ShaderNodeObject<UniformNode<Vector2>>
  public atlasGrid: ShaderNodeObject<UniformNode<Vector2>>
  public atlasCellSize: ShaderNodeObject<UniformNode<Vector2>>
  public atlasSize: ShaderNodeObject<UniformNode<Vector2>>

  constructor(options: TileMaterialOptionsInput) {
    const parsedOptions = TileMaterialOptions.parse(options)

    super()

    this.transparent = true

    this.atlas = uniform(parsedOptions.atlas)

    const cells = parsedOptions.tileGrid[0] * parsedOptions.tileGrid[1]
    this.chars = uniformArray(new Array(cells).fill(parsedOptions.clearCharIndex), 'uint')
    this.colors = uniformArray(new Array(cells).fill(parsedOptions.clearColor), 'uint')

    // Atlas configuration - extracted from the original TileGeometry logic
    this.tileGrid = uniform(new Vector2().fromArray(parsedOptions.tileGrid), 'uvec2')
    this.atlasGrid = uniform(new Vector2().fromArray(parsedOptions.atlasGrid), 'uvec2')
    this.atlasCellSize = uniform(new Vector2().fromArray(parsedOptions.atlasCellSize), 'uvec2')
    this.atlasSize = uniform(new Vector2(parsedOptions.atlas.width, parsedOptions.atlas.height), 'uvec2')

    const median = (r: any, g: any, b: any) => max(min(r, g), min(max(r, g), b))

    const vuv = uv()

    // Calculate which tile we're in based on UV coordinates (0->1 across the tile)
    // Scale UV by grid dimensions to get tile coordinates
    const tileU = mul(vuv.x, this.tileGrid.x)
    const tileV = mul(vuv.y, this.tileGrid.y)

    const tileCol = floor(tileU)
    const tileRow = sub(this.tileGrid.y, uint(1), floor(tileV))

    // Convert 2D tile coordinates to 1D index for chars array lookup
    const tileIndex = add(tileCol, mul(tileRow, this.tileGrid.x))

    // Calculate atlas position from character index
    const charIndex = this.chars.element(tileIndex)

    const atlasCol = float(mod(charIndex, this.atlasGrid.x))
    const atlasRow = float(div(charIndex, this.atlasGrid.x))

    // Calculate UV bounds for this character in the atlas
    const x1 = div(mul(atlasCol, this.atlasCellSize.x), this.atlasSize.x)
    const y1 = sub(1.0, div(mul(add(atlasRow, 1), this.atlasCellSize.y), this.atlasSize.y))
    const x2 = div(mul(add(atlasCol, 1), this.atlasCellSize.x), this.atlasSize.x)
    const y2 = sub(1.0, div(mul(atlasRow, this.atlasCellSize.y), this.atlasSize.y))

    // Map local UV within tile (fractional part) to atlas cell UV bounds
    const localU = mul(sub(tileU, floor(tileU)), 0.99)
    const localV = mul(sub(tileV, floor(tileV)), 0.99)

    const atlasUV = vec2(add(x1, mul(localU, sub(x2, x1))), add(y1, mul(localV, sub(y2, y1))))

    const s = texture(this.atlas.value, atlasUV)

    const sigDist = sub(median(s.r, s.g, s.b), 0.5)
    const alpha = clamp(add(div(sigDist, fwidth(sigDist)), 0.5), 0.0, 1.0)

    const color = this.colors.element(tileIndex)

    const r = div(float(mod(shiftRight(color, 24), 256)), 255.0)
    const g = div(float(mod(shiftRight(color, 16), 256)), 255.0)
    const b = div(float(mod(shiftRight(color, 8), 256)), 255.0)
    const a = div(float(mod(color, 256)), 255.0)

    this.colorNode = vec4(r, g, b, a)
    this.opacityNode = mul(this.opacity, alpha)
  }
}

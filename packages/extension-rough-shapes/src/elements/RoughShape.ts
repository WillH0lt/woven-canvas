import type { Snapshot } from '@infinitecanvas/core'
import { BaseEditable } from '@infinitecanvas/core/elements'
import { colorToHex } from '@infinitecanvas/core/helpers'
import { type Text, type TextElement, VerticalAlign } from '@infinitecanvas/extension-text'
import { type PropertyValues, css, html, svg } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import rough from 'roughjs'
import type { Drawable, Options, PathInfo as RoughPathInfo } from 'roughjs/bin/core'

import type { RoughShape } from '../components/RoughShape'
import { shapeVertices } from '../shapes'
import { ShapeFillKind, ShapeKind, ShapeStrokeKind } from '../types'

interface PathInfo {
  d: string
  stroke: string
  fill?: string
  'stroke-width'?: number
  'stroke-dasharray'?: string
  'stroke-linecap'?: 'round' | 'butt' | 'square' | 'inherit' | undefined
  'stroke-linejoin'?: 'round' | 'bevel' | 'miter' | 'inherit' | undefined
}

function toPathInfo(path: RoughPathInfo, dashArray: string | undefined, strokeWidth: number | undefined): PathInfo {
  const pathInfo: PathInfo = {
    d: path.d,
    fill: path.fill,
    stroke: path.stroke,
  }

  if (dashArray) {
    pathInfo['stroke-dasharray'] = dashArray
  }

  if (strokeWidth) {
    pathInfo['stroke-width'] = strokeWidth
  }

  pathInfo['stroke-linecap'] = 'round'
  pathInfo['stroke-linejoin'] = 'round'

  return pathInfo
}

@customElement('ic-rough-shape')
export class RoughShapeElement extends BaseEditable {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: TextElement

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public roughShape!: RoughShape

  static styles = css`
    :host * {
      box-sizing: border-box;
    }

    #container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
    }

    #text {
      max-width: 100%;
      max-height: 100%;
      padding: 16px;
    }

    #shape {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: -1;
    }
  `

  public firstUpdated(_changedProperties: PropertyValues): void {
    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)

    const textObserver = new ResizeObserver(() => {
      if (this.editing) {
        this.requestUpdate()
      }
    })
    textObserver.observe(this.textElement)
  }

  private rc = rough.generator()

  render() {
    const alignStyle =
      {
        [VerticalAlign.Top]: 'flex-start',
        [VerticalAlign.Center]: 'center',
        [VerticalAlign.Bottom]: 'flex-end',
      }[this.text.verticalAlign] || 'flex-start'

    return html`
      <div id="container" style=${styleMap({
        'align-items': alignStyle,
      })}>
        <div id="text" style=${styleMap({
          overflow: this.editing ? 'visible' : 'hidden',
        })}>
          <ic-text
            blockId=${this.blockId} 
            .editing=${this.editing} 
            .text=${this.text} 
          ></ic-text>
        </div>
        <div id="shape">
          ${this.roughShapeSvg(this.clientWidth, this.clientHeight)}
        </div>
      </div>
    `
  }

  private roughShapeSvg(width: number, height: number): unknown {
    const { strokeInfo, fillInfo } = this.getPathInfo(width, height)

    return html`
      <svg
        viewBox="0 0 ${width} ${height}"
        style="overflow: visible;"
      >
        <g>
          ${
            fillInfo
              ? svg`<path
                d=${fillInfo.d}
                fill=${fillInfo.fill}
                stroke=${fillInfo.stroke}
                stroke-width=${fillInfo['stroke-width']}
                stroke-dasharray=${fillInfo['stroke-dasharray']}
                stroke-linecap=${fillInfo['stroke-linecap']}
                stroke-linejoin=${fillInfo['stroke-linejoin']}
                ></path>`
              : ''
          }
          ${
            strokeInfo
              ? svg`<path
                d=${strokeInfo.d}
                fill="none"
                stroke=${strokeInfo.stroke}
                stroke-width=${strokeInfo['stroke-width']}
                stroke-dasharray=${strokeInfo['stroke-dasharray']}
                stroke-linecap=${strokeInfo['stroke-linecap']}
                stroke-linejoin=${strokeInfo['stroke-linejoin']}
                ></path>`
              : ''
          }
        </g>
      </svg>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    snapshot[this.blockId].Block.width = this.container.clientWidth
    snapshot[this.blockId].Block.height = this.container.clientHeight

    return snapshot
  }

  private getPathInfo(width: number, height: number): { strokeInfo: PathInfo | null; fillInfo: PathInfo | null } {
    let shapeNode: Drawable | null = null

    const shape = this.roughShape

    const options: Options = {
      stroke: colorToHex({
        red: shape.strokeRed,
        green: shape.strokeGreen,
        blue: shape.strokeBlue,
        alpha: shape.strokeAlpha,
      }),
      strokeWidth: shape.strokeWidth,
      disableMultiStroke: shape.strokeKind !== ShapeStrokeKind.Solid,
      fill: colorToHex({
        red: shape.fillRed,
        green: shape.fillGreen,
        blue: shape.fillBlue,
        alpha: shape.fillAlpha,
      }),
      fillStyle: shape.fillKind,
      hachureGap: shape.hachureGap,
      hachureAngle: shape.hachureAngle,
      disableMultiStrokeFill: true,
      seed: shape.seed + 1,
      roughness: shape.roughness,
      preserveVertices: true,
    }

    if (shape.strokeKind === ShapeStrokeKind.Dashed) {
      options.strokeLineDash = [3 * shape.strokeWidth, 3 * shape.strokeWidth]
    } else if (shape.strokeKind === ShapeStrokeKind.Dotted) {
      options.strokeLineDash = [shape.strokeWidth, 3 * shape.strokeWidth]
    }

    if (shape.kind === ShapeKind.Ellipse) {
      shapeNode = this.rc.ellipse(width / 2, height / 2, width, height, options)
    } else {
      const name = shape.kind.toString().toLowerCase() as keyof typeof shapeVertices
      if (!shapeVertices[name]) {
        throw new Error(`Unknown shape kind: ${name}`)
      }

      const vertices = shapeVertices[name].map(([x, y]) => [x * width, y * height]) as [number, number][]

      shapeNode = this.rc.polygon(vertices, options)
    }

    const paths = this.rc.toPaths(shapeNode)

    let fillInfo: PathInfo | null = toPathInfo(paths[0], undefined, shape.fillWidth)
    if (shape.fillKind === ShapeFillKind.None) {
      fillInfo = null
    }

    let strokeInfo: PathInfo | null = toPathInfo(
      paths[1],
      options.strokeLineDash ? options.strokeLineDash.join(' ') : undefined,
      options.strokeWidth,
    )
    if (shape.strokeKind === ShapeStrokeKind.None) {
      strokeInfo = null
    }

    return {
      fillInfo,
      strokeInfo,
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape': RoughShapeElement
  }
}

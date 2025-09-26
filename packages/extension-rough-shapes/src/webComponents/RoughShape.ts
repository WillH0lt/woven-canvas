import { type ICText, type Snapshot, TextAlign, VerticalAlign } from '@infinitecanvas/core'
import { Color, type Text, type VerticalAlign as VerticalAlignComp } from '@infinitecanvas/core/components'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import { type PropertyValues, css, html, nothing, svg } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import rough from 'roughjs'
import type { Drawable, Options, PathInfo as RoughPathInfo } from 'roughjs/bin/core'

import type { RoughShape } from '../components/RoughShape'
import { shapeVertices } from '../shapes'
import { RoughShapeKind, ShapeFillKind, ShapeStrokeKind } from '../types'

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
export class ICRoughShape extends ICEditableBlock {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: ICText

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public verticalAlign!: VerticalAlignComp

  @property({ type: Object })
  public roughShape!: RoughShape

  static styles = [
    ...super.styles,
    css`
      :host * {
        box-sizing: border-box;
      }

      :host([is-hovered]) > :first-child::after,
      :host([is-selected]) > :first-child::after {
        border: none;
      }

      #container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        container-type: inline-size;
      }

      #text {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        padding: 16px;
      }

      @container (max-width: 48px) {
        #text {
          padding: 0;
        }
      }

      #shape {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: -1;
      }
    `,
  ]

  public firstUpdated(_changedProperties: PropertyValues): void {
    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)

    const textObserver = new ResizeObserver(() => {
      if (this.isEditing) {
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
      }[this.verticalAlign.value] || 'flex-start'

    return html`
      <div id="container" style=${styleMap({
        'align-items': alignStyle,
      })}>
        <div id="text" style=${styleMap({
          overflow: this.isEditing ? 'visible' : 'hidden',
        })}>
          <ic-text
            blockId=${this.blockId} 
            .isEditing=${this.isEditing} 
            .text=${this.text} 
            .defaultAlignment=${TextAlign.Center}
          ></ic-text>
        </div>
        <div id="shape">
          ${this.roughShapeSvg(this.clientWidth, this.clientHeight)}
        </div>
      </div>
    `
  }

  private roughShapeSvg(width: number, height: number): unknown {
    const { strokeInfo, fillInfo, highlightInfo } = this.getPathInfo(width, height)

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
          ${
            this.isEmphasized
              ? svg`<path
                d=${highlightInfo.d}
                fill="none"
                stroke="var(--ic-highlighted-block-outline-color)"
                stroke-width="var(--ic-highlighted-block-outline-width)"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>`
              : nothing
          }
        </g>
      </svg>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    return {
      [this.blockId]: {
        Block: {
          width: this.container.clientWidth,
          height: this.container.clientHeight,
        },
        Text: snapshot[this.blockId].Text,
      },
    }
  }

  private getPathInfo(
    width: number,
    height: number,
  ): { strokeInfo: PathInfo | null; fillInfo: PathInfo | null; highlightInfo: PathInfo } {
    let shapeNode: Drawable | null = null

    const shape = this.roughShape

    const strokeHex = new Color()
      .fromJson({
        red: shape.strokeRed,
        green: shape.strokeGreen,
        blue: shape.strokeBlue,
        alpha: shape.strokeAlpha,
      })
      .toHex()

    const fillHex = new Color()
      .fromJson({
        red: shape.fillRed,
        green: shape.fillGreen,
        blue: shape.fillBlue,
        alpha: shape.fillAlpha,
      })
      .toHex()

    const options: Options = {
      stroke: strokeHex,
      strokeWidth: shape.strokeWidth,
      disableMultiStroke: shape.strokeKind !== ShapeStrokeKind.Solid,
      fill: fillHex,
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

    if (shape.kind === RoughShapeKind.Ellipse) {
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

    let strokeInfo: PathInfo | null = null

    if (shape.strokeKind !== ShapeStrokeKind.None) {
      strokeInfo = toPathInfo(
        paths[1],
        options.strokeLineDash ? options.strokeLineDash.join(' ') : undefined,
        options.strokeWidth,
      )
    }

    const highlightInfo = toPathInfo(paths[1], undefined, 1)

    return {
      fillInfo,
      strokeInfo,
      highlightInfo,
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape': ICRoughShape
  }
}

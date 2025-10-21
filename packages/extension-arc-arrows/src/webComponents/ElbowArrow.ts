import type { ICText, Snapshot } from '@infinitecanvas/core'
import type { Color, Text } from '@infinitecanvas/core/components'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import { type SVGTemplateResult, css, html, nothing, svg } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

import type { ArrowTrim, ElbowArrow } from '../components'
import { ArrowHeadKind } from '../types'
import { getArrowHeadPath } from './common'

@customElement('ic-elbow-arrow')
export class ICElbowArrow extends ICEditableBlock {
  static styles = [
    ...super.styles,
    css`
    :host * {
      box-sizing: border-box;
      overflow: visible;
    }
    
    :host([is-hovered]) > :first-child::after,
    :host([is-selected]) > :first-child::after {
      border: none;
    }

    #container {
      display: flex;
      position: relative;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    
    .arrow {
      width: 100%;
      height: 100%;
      overflow: visible !important;
    }
  `,
  ]

  @query('#container') container!: HTMLElement

  @query('ic-text') textElement!: ICText

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public color!: Color

  @property({ type: Object })
  public elbowArrow!: ElbowArrow

  @property({ type: Object })
  public arrowTrim: ArrowTrim | undefined = undefined

  public connectedCallback(): void {
    super.connectedCallback()

    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)
  }

  render() {
    const hex = this.color.toHex()

    return html`
      <div id="container">
        <svg
          class="arrow"
          preserveAspectRatio="none"
        >
          ${this.isEmphasized ? this.getPath(2, 'var(--ic-gray-600)', '12', false) : null}
          ${this.getPath(this.elbowArrow.thickness, hex, 'none', true)}
          ${this.isEmphasized ? this.getPath(2, 'var(--ic-highlighted-block-outline-color)', 'none', true) : null}
        </svg>
      </div>
    `
  }

  private getPath(thickness: number, color: string, dasharray: string, trim: boolean): SVGTemplateResult {
    if (this.elbowArrow.pointCount < 2) {
      return svg``
    }

    const points: [number, number][] = []
    for (let i = 0; i < this.elbowArrow.pointCount; i++) {
      const point = this.elbowArrow.getPoint(i)
      point[0] *= this.clientWidth
      point[1] *= this.clientHeight
      points.push(point)
    }

    // let a: [number, number] = [this.elbowArrow.a[0] * this.clientWidth, this.elbowArrow.a[1] * this.clientHeight]
    // const b: [number, number] = [this.elbowArrow.b[0] * this.clientWidth, this.elbowArrow.b[1] * this.clientHeight]
    // const c: [number, number] = [this.elbowArrow.c[0] * this.clientWidth, this.elbowArrow.c[1] * this.clientHeight]
    // let d: [number, number] = [this.elbowArrow.d[0] * this.clientWidth, this.elbowArrow.d[1] * this.clientHeight]

    const lines: [[number, number], [number, number]][] = []
    for (let i = 0; i < points.length - 1; i++) {
      lines.push([points[i], points[i + 1]])
    }

    const startDir: [number, number] = [points[1][0] - points[0][0], points[1][1] - points[0][1]]
    const endDir: [number, number] = [
      points[points.length - 1][0] - points[points.length - 2][0],
      points[points.length - 1][1] - points[points.length - 2][1],
    ]

    // const startDir: [number, number] = [b[0] - a[0], b[1] - a[1]]
    // const endDir: [number, number] = [d[0] - c[0], d[1] - c[1]]

    // let tStart = 0
    // let tEnd = 1
    // if (trim && this.arrowTrim) {
    //   tStart = this.arrowTrim.tStart
    //   if (tStart !== 0 && this.elbowArrow.startArrowHead !== ArrowHeadKind.None) {
    //     const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    //     const gap = ARROW_HEAD_GAP / len

    //     tStart += gap
    //   }

    //   tEnd = this.arrowTrim.tEnd
    //   if (tEnd !== 1 && this.elbowArrow.endArrowHead !== ArrowHeadKind.None) {
    //     const len = Math.hypot(d[0] - c[0], d[1] - c[1])
    //     const gap = ARROW_HEAD_GAP / len
    //     tEnd -= gap
    //   }

    //   a = [a[0] + (b[0] - a[0]) * tStart, a[1] + (b[1] - a[1]) * tStart]
    //   d = [c[0] + (d[0] - c[0]) * tEnd, c[1] + (d[1] - c[1]) * tEnd]
    // }

    // const lines = [
    //   [a, b],
    //   [b, c],
    //   [c, d],
    // ]

    return svg`
      <g>
        ${lines.map(([start, end]) => this.drawLine(start, end, thickness, color, dasharray))}
        ${
          trim && this.elbowArrow.startArrowHead !== ArrowHeadKind.None
            ? getArrowHeadPath(points[0], startDir, this.elbowArrow.startArrowHead, thickness, color)
            : nothing
        }
        ${
          trim && this.elbowArrow.endArrowHead !== ArrowHeadKind.None
            ? getArrowHeadPath(points[points.length - 1], endDir, this.elbowArrow.endArrowHead, thickness, color)
            : nothing
        }    
      </g>
    `

    // return svg`<line
    //   x1="${start[0]}"
    //   y1="${start[1]}"
    //   x2="${end[0]}"
    //   y2="${end[1]}"
    //   stroke="${color}"
    //   fill="none"
    //   stroke-width="${thickness}"
    //   stroke-linecap="round"
    //   stroke-dasharray="${dasharray}"
    // />
    // ${
    //   trim && this.elbowArrow.startArrowHead !== ArrowHeadKind.None
    //     ? this.getArrowHeadPath(start, flipDirection(vec), this.elbowArrow.startArrowHead, thickness, color)
    //     : nothing
    // }
    // ${
    //   trim && this.elbowArrow.endArrowHead !== ArrowHeadKind.None
    //     ? this.getArrowHeadPath(end, vec, this.elbowArrow.endArrowHead, thickness, color)
    //     : nothing
    // }`
  }

  private drawLine(
    start: [number, number],
    end: [number, number],
    thickness: number,
    color: string,
    dasharray: string,
  ): SVGTemplateResult {
    return svg`<line
      x1="${start[0]}"
      y1="${start[1]}"
      x2="${end[0]}"
      y2="${end[1]}"
      stroke="${color}"
      fill="none"
      stroke-width="${thickness}"
      stroke-linecap="round"
      stroke-dasharray="${dasharray}"
    />`
  }

  public getSnapshot(): Snapshot {
    // const snapshot = this.textElement.getSnapshot()

    // const { width, height, left, top } = this.computeBlockDimensions(this.container)

    // snapshot[this.blockId].Block.width = width
    // snapshot[this.blockId].Block.height = height
    // snapshot[this.blockId].Block.left = left
    // snapshot[this.blockId].Block.top = top

    // return snapshot

    return {}
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-elbow-arrow': ICElbowArrow
  }
}

import type { ICText, Snapshot } from '@infinitecanvas/core'
import { type Color, HitArc, type Text } from '@infinitecanvas/core/components'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import { type SVGTemplateResult, css, html, nothing, svg } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

import type { Arrow, ArrowTrim } from '../components'
import { ArrowHeadKind } from '../types'

const ARROW_HEAD_GAP = 15

@customElement('ic-arrow')
export class ICArrow extends ICEditableBlock {
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
  public arrow!: Arrow

  @property({ type: Object })
  public arrowTrim: ArrowTrim | undefined = undefined

  private arc = new HitArc()

  public connectedCallback(): void {
    super.connectedCallback()

    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)
  }

  render() {
    const hex = this.color.toHex()

    if (this.arrow.isCurved()) {
      this.arc.update(
        [this.arrow.a[0] * this.clientWidth, this.arrow.a[1] * this.clientHeight],
        [this.arrow.b[0] * this.clientWidth, this.arrow.b[1] * this.clientHeight],
        [this.arrow.c[0] * this.clientWidth, this.arrow.c[1] * this.clientHeight],
      )
    }

    return html`
      <div id="container">
        <svg
          class="arrow"
          preserveAspectRatio="none"
        >
          ${this.isEmphasized ? this.getPath(2, 'var(--ic-gray-600)', '12', false) : null}
          ${this.getPath(this.arrow.thickness, hex, 'none', true)}
          ${this.isEmphasized ? this.getPath(2, 'var(--ic-highlighted-block-outline-color)', 'none', true) : null}
        </svg>
      </div>
    `
  }

  private getPath(thickness: number, color: string, dasharray: string, trim: boolean): SVGTemplateResult {
    if (this.arrow.isCurved()) {
      return this.getCurvedPath(thickness, color, dasharray, trim)
    }
    return this.getStraightPath(thickness, color, dasharray, trim)
  }

  private getCurvedPath(thickness: number, color: string, dasharray: string, trim: boolean): SVGTemplateResult {
    const arc = this.arc

    let start = arc.a
    let end = arc.c
    let arcAngle = arc._arcAngle
    let tStart = 0
    let tEnd = 1
    if (trim && this.arrowTrim) {
      const gap = ARROW_HEAD_GAP / arc.length()

      tStart = this.arrowTrim.tStart
      if (tStart !== 0 && this.arrow.startArrowHead !== ArrowHeadKind.None) {
        tStart += gap
      }

      tEnd = this.arrowTrim.tEnd
      if (tEnd !== 1 && this.arrow.endArrowHead !== ArrowHeadKind.None) {
        tEnd -= gap
      }

      start = arc.parametricToPoint(tStart)
      end = arc.parametricToPoint(tEnd)
      arcAngle = arc._arcAngle * (tEnd - tStart)
    }

    const startDir = flipDirection(arc.directionAt(tStart))
    const endDir = arc.directionAt(tEnd)

    return svg`<path
      d="M ${start[0]} ${start[1]} A ${arc._radius} ${arc._radius} 0 ${arcAngle > Math.PI ? 1 : 0} ${arc._clockwise ? 0 : 1} ${end[0]} ${end[1]}"
      stroke="${color}"
      fill="none"
      stroke-width="${thickness}"
      stroke-dasharray="${dasharray}"
      stroke-linecap="round"
    />
    ${
      trim && this.arrow.startArrowHead !== ArrowHeadKind.None
        ? this.getArrowHeadPath(start, startDir, this.arrow.startArrowHead, thickness, color)
        : nothing
    }
    ${
      trim && this.arrow.endArrowHead !== ArrowHeadKind.None
        ? this.getArrowHeadPath(end, endDir, this.arrow.endArrowHead, thickness, color)
        : nothing
    }`
  }

  private getStraightPath(thickness: number, color: string, dasharray: string, trim: boolean): SVGTemplateResult {
    const a = [this.arrow.a[0] * this.clientWidth, this.arrow.a[1] * this.clientHeight]
    const c = [this.arrow.c[0] * this.clientWidth, this.arrow.c[1] * this.clientHeight]

    let start: [number, number] = [a[0], a[1]]
    let end: [number, number] = [c[0], c[1]]

    const vec: [number, number] = [end[0] - start[0], end[1] - start[1]]
    const length = Math.hypot(vec[0], vec[1])

    if (length === 0) {
      return svg``
    }

    let tStart = 0
    let tEnd = 1
    if (trim && this.arrowTrim) {
      const gap = ARROW_HEAD_GAP / length

      tStart = this.arrowTrim.tStart
      if (tStart !== 0 && this.arrow.startArrowHead !== ArrowHeadKind.None) {
        tStart += gap
      }

      tEnd = this.arrowTrim.tEnd
      if (tEnd !== 1 && this.arrow.endArrowHead !== ArrowHeadKind.None) {
        tEnd -= gap
      }

      start = [a[0] + (c[0] - a[0]) * tStart, a[1] + (c[1] - a[1]) * tStart]
      end = [a[0] + (c[0] - a[0]) * tEnd, a[1] + (c[1] - a[1]) * tEnd]
    }

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
    />
    ${
      trim && this.arrow.startArrowHead !== ArrowHeadKind.None
        ? this.getArrowHeadPath(start, flipDirection(vec), this.arrow.startArrowHead, thickness, color)
        : nothing
    }
    ${
      trim && this.arrow.endArrowHead !== ArrowHeadKind.None
        ? this.getArrowHeadPath(end, vec, this.arrow.endArrowHead, thickness, color)
        : nothing
    }`
  }

  private getArrowHeadPath(
    position: [number, number],
    direction: [number, number],
    arrowHeadKind: ArrowHeadKind,
    thickness: number,
    color: string,
  ): SVGTemplateResult {
    const dirLen = Math.hypot(direction[0], direction[1])
    if (dirLen === 0) {
      return svg``
    }
    const unitDir: [number, number] = [direction[0] / dirLen, direction[1] / dirLen]
    const perpDir: [number, number] = [-unitDir[1], unitDir[0]]

    const length = 15
    const width = 20

    const p1: [number, number] = [
      position[0] - unitDir[0] * length + perpDir[0] * (width / 2),
      position[1] - unitDir[1] * length + perpDir[1] * (width / 2),
    ]
    const p2: [number, number] = [
      position[0] - unitDir[0] * length - perpDir[0] * (width / 2),
      position[1] - unitDir[1] * length - perpDir[1] * (width / 2),
    ]

    return svg`
      <line
        x1="${p1[0]}"
        y1="${p1[1]}"
        x2="${position[0]}"
        y2="${position[1]}"
        stroke="${color}"
        stroke-width="${thickness}"
        stroke-linecap="round"
      />
      <line
        x1="${p2[0]}"
        y1="${p2[1]}"
        x2="${position[0]}"
        y2="${position[1]}"
        stroke="${color}"
        stroke-width="${thickness}"
        stroke-linecap="round"
      />
      `
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

function flipDirection(direction: [number, number]): [number, number] {
  return [-direction[0], -direction[1]]
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-arrow': ICArrow
  }
}

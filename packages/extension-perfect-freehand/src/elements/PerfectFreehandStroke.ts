import { ICBaseBlock } from '@infinitecanvas/core/elements'
import type { Color } from '@infinitecanvas/extension-color'
import { type PropertyValues, css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getStroke } from 'perfect-freehand'

import type { Stroke } from '../components'

function average(a: number, b: number) {
  return (a + b) / 2
}

function getSvgPathFromStroke(points: number[][]): string {
  let a = points[0]
  let b = points[1]
  const c = points[2]

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`

  for (let i = 2; i < points.length - 1; i++) {
    a = points[i]
    b = points[i + 1]
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }

  result += `${b[0].toFixed(2)},${b[1].toFixed(2)} `

  result += 'Z'

  return result
}

@customElement('ic-perfect-freehand-stroke')
export class ICPerfectFreehandStroke extends ICBaseBlock {
  static styles = [
    ...super.styles,
    css`
    :host * {
      box-sizing: border-box;
      overflow: visible;
    }
    
    :host([is-hovered]),
    :host([is-selected]) {
      outline: none;
    }

    #container {
      display: relative;
      width: 100%;
      height: 100%;
    }

    #highlight {
      position: absolute;
      inset: 0;
    }
  `,
  ]

  @property({ type: Object })
  public stroke!: Stroke

  @property({ type: Object })
  public color!: Color

  @state()
  private path = ''

  @state()
  private highlightedPath = ''

  public connectedCallback(): void {
    super.connectedCallback()
    this.generatePath()

    const observer = new ResizeObserver(() => {
      this.generatePath()
    })
    observer.observe(this)
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    const stroke = _changedProperties.get('stroke')

    if (!stroke) return true

    this.generatePath()

    return true
  }

  public render() {
    const hex = this.color.toHex()

    return html`
      <div id="container">
        <svg preserveAspectRatio="none">
          <path
            d="${this.path}"
            fill="${hex}"
          />
        </svg>
        ${
          this.isHovered || this.isSelected
            ? html`
              <svg id="highlight" preserveAspectRatio="none">
                <path
                  d="${this.highlightedPath}"
                  stroke="var(--ic-highlighted-block-outline-color)"
                  stroke-width="1"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            `
            : nothing
        }
      </div>
      `
  }

  private generatePath() {
    if (this.stroke.pointCount <= 4 || !this.stroke.originalWidth || !this.stroke.originalHeight) {
      // draw a dot
      const r = this.stroke.diameter / 2
      this.path = `M 0,${-r} a ${r},${r} 0 1 0 0.0001 0`
      return
    }

    const inputPoints: [number, number][] = []

    const scaleX = this.clientWidth / this.stroke.originalWidth
    const scaleY = this.clientHeight / this.stroke.originalHeight

    for (let i = 0; i < this.stroke.pointCount; i++) {
      inputPoints.push([
        (this.stroke.points[i * 2] - this.stroke.originalLeft) * scaleX,
        (this.stroke.points[i * 2 + 1] - this.stroke.originalTop) * scaleY,
      ])
    }

    const outlinePoints = getStroke(inputPoints, {
      last: this.stroke.isComplete,
      size: this.stroke.diameter,
    })
    this.path = getSvgPathFromStroke(outlinePoints)

    if (this.stroke.isComplete) {
      const highlightPoints = getStroke(inputPoints, {
        last: true,
        size: 1,
      })
      this.highlightedPath = getSvgPathFromStroke(highlightPoints)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-perfect-freehand-stroke': ICPerfectFreehandStroke
  }
}

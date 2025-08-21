import { ICBaseBlock } from '@infinitecanvas/core/elements'
import type { Color } from '@infinitecanvas/extension-color'
import { type PropertyValues, css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getStroke } from 'perfect-freehand'

import type { Stroke } from '../components'

function average(a: number, b: number) {
  return (a + b) / 2
}

function getSvgPathFromStroke(stroke: Stroke, diameter: number, inputPoints: [number, number][]): string {
  if (stroke.pointCount <= 4 || !stroke.originalWidth || !stroke.originalHeight) {
    // draw a dot
    const r = diameter / 2
    return `M ${r},0 a ${r},${r} 0 1 0 0.0001 0`
  }

  const outlinePoints = getStroke(inputPoints, {
    last: stroke.isComplete,
    size: diameter,
  })

  let a = outlinePoints[0]
  let b = outlinePoints[1]
  const c = outlinePoints[2]

  let path = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2,
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`

  for (let i = 2; i < outlinePoints.length - 1; i++) {
    a = outlinePoints[i]
    b = outlinePoints[i + 1]
    path += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }

  path += `${b[0].toFixed(2)},${b[1].toFixed(2)} `

  path += 'Z'

  return path
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
    const inputPoints: [number, number][] = []

    const scaleX = this.clientWidth / this.stroke.originalWidth
    const scaleY = this.clientHeight / this.stroke.originalHeight

    for (let i = 0; i < this.stroke.pointCount; i++) {
      inputPoints.push([
        (this.stroke.points[i * 2] - this.stroke.originalLeft) * scaleX,
        (this.stroke.points[i * 2 + 1] - this.stroke.originalTop) * scaleY,
      ])
    }

    this.path = getSvgPathFromStroke(this.stroke, this.stroke.diameter, inputPoints)

    if (this.stroke.isComplete) {
      const diameter = inputPoints.length === 1 ? this.stroke.diameter : 1
      this.highlightedPath = getSvgPathFromStroke(this.stroke, diameter, inputPoints)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-perfect-freehand-stroke': ICPerfectFreehandStroke
  }
}

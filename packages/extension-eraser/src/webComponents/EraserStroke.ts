import { ICBaseBlock } from '@infinitecanvas/core/elements'
import { type PropertyValues, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { getStroke } from 'perfect-freehand'

import type { EraserStroke } from '../components'
import { POINTS_CAPACITY, STROKE_RADIUS } from '../constants'

function average(a: number, b: number) {
  return (a + b) / 2
}

function getSvgPathFromStroke(stroke: EraserStroke, diameter: number, inputPoints: [number, number][]): string {
  if (stroke.pointCount <= 4) {
    return ''
  }

  const outlinePoints = getStroke(inputPoints, {
    size: diameter,
    start: {
      taper: 66,
      cap: true,
    },
  })

  if (outlinePoints.length < 3) {
    return ''
  }

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

@customElement('ic-eraser-stroke')
export class ICEraserStroke extends ICBaseBlock {
  static styles = [
    ...super.styles,
    css`
    :host * {
      box-sizing: border-box;
      overflow: visible;
      display: block;
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
  `,
  ]

  @property({ type: Object })
  public eraserStroke!: EraserStroke

  @state()
  private path = ''

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    const stroke = _changedProperties.get('eraserStroke')

    if (!stroke) return true

    this.generatePath()

    return true
  }

  public render() {
    const hex = '#88888833'

    return html`
      <div id="container">
        <svg preserveAspectRatio="none">
          <path
            d="${this.path}"
            fill="${hex}"
          />
        </svg>
      </div>
      `
  }

  private generatePath() {
    const inputPoints: [number, number][] = []

    const { left, top } = this.computeBlockDimensions(this)

    for (let i = this.eraserStroke.firstPointIndex; i < this.eraserStroke.pointCount; i++) {
      const index = (i * 2) % POINTS_CAPACITY
      inputPoints.push([this.eraserStroke.points[index] - left, this.eraserStroke.points[index + 1] - top])
    }

    this.path = getSvgPathFromStroke(this.eraserStroke, 2 * STROKE_RADIUS, inputPoints)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-eraser-stroke': ICEraserStroke
  }
}

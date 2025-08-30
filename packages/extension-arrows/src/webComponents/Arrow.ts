import type { Snapshot } from '@infinitecanvas/core'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import type { Color } from '@infinitecanvas/extension-color'
import type { ICText, Text } from '@infinitecanvas/extension-text'
import { css, html, svg } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'

import type { Arrow } from '../components'
import { Arc } from '../helpers'

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
      background-color: #ff000044;
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

  public connectedCallback(): void {
    super.connectedCallback()

    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)
  }

  render() {
    const hex = this.color.toHex()

    const a: [number, number] = [this.arrow.a[0] * this.clientWidth, this.arrow.a[1] * this.clientHeight]
    const b: [number, number] = [this.arrow.b[0] * this.clientWidth, this.arrow.b[1] * this.clientHeight]
    const c: [number, number] = [this.arrow.c[0] * this.clientWidth, this.arrow.c[1] * this.clientHeight]

    const arc = new Arc(a, b, c)

    return html`
      <div id="container">
        <svg
          class="arrow"
          preserveAspectRatio="none"
        >
          ${
            this.arrow.isCurved()
              ? svg`<path
                  d="M ${a[0]} ${a[1]} A ${arc.radius} ${arc.radius} 0 ${arc.arcAngle > Math.PI ? 1 : 0} ${arc.clockwise ? 1 : 0} ${c[0]} ${c[1]}"
                  stroke="${hex}"
                  fill="none"
                  stroke-width="${this.arrow.diameter}"
                  stroke-linecap="round"
                />`
              : svg`<line
                  x1="${a[0]}"
                  y1="${a[1]}"
                  x2="${c[0]}"
                  y2="${c[1]}"
                  stroke="${hex}"
                  fill="none"
                  stroke-width="${this.arrow.diameter}"
                  stroke-linecap="round"
                />`
          }

        </svg>
      </div>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    const { width, height, left, top } = this.computeBlockDimensions(this.container)

    snapshot[this.blockId].Block.width = width
    snapshot[this.blockId].Block.height = height
    snapshot[this.blockId].Block.left = left
    snapshot[this.blockId].Block.top = top

    return snapshot
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-arrow': ICArrow
  }
}

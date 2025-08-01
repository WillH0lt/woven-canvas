import type { Color } from '@infinitecanvas/core/components'
import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import { BaseElement } from './base'

@customElement('ic-shape')
export class ShapeElement extends BaseElement {
  @property({ type: Object })
  public color!: Color

  static styles = css`
    div {
      width: 100%;
      height: 100%;
    }
  `

  render() {
    return html`
      <div style=${styleMap({
        'background-color': `rgba(${this.color.red}, ${this.color.green}, ${this.color.blue}, ${this.color.alpha / 255})`,
      })}></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-shape': ShapeElement
  }
}

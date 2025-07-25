import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import tinycolor from 'tinycolor2'

import { style } from './color-bubbles.style'

const PALETTE = ['#000000', '#434343', '#ff3e41', '#ff8a43', '#ffeb7f', '#00c9a7', '#007ea7', '#6a58f2', '#ffffff']

@customElement('ic-color-bubbles')
export class ColorBubblesElement extends LitElement {
  static styles = style

  @property() currentColor = '#000000'

  @property({ type: Array }) palette: string[] = PALETTE

  @property({ type: Boolean }) withPicker = false

  render() {
    return html`
      <div class="container">
        ${this.palette.map(
          (color) => html`
            <div
              class="${classMap({
                'color-bubble': true,
                selected: tinycolor.equals(this.currentColor, color),
              })}"
              style=${styleMap({
                backgroundColor: color,
              })}
              @click=${() => {
                this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: color }))
                this.currentColor = color
                this.requestUpdate()
              }}
            ></div>
          `,
        )}
        ${
          this.withPicker
            ? html`
            <div
              class="${classMap({
                'color-bubble': true,
                rainbow: true,
                selected: !this.palette.find((c) => tinycolor.equals(this.currentColor, c)),
              })}"
              @click=${() => {
                this.dispatchEvent(new CustomEvent('show-picker', { bubbles: true, composed: true }))
              }}
            ></div>        `
            : ''
        }
        </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-color-bubbles': ColorBubblesElement
  }
}

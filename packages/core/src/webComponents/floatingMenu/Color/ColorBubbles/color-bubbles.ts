import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import tinycolor from 'tinycolor2'

import { style } from './color-bubbles.style'

@customElement('ic-color-bubbles')
export class ICColorBubbles extends LitElement {
  static styles = style

  @property() currentColor = '#000000'

  @property({ type: Array }) palette: string[] = []

  @property({ type: Boolean }) withPicker = false

  @property({ type: Boolean }) hideHighlight = false

  render() {
    return html`
      <div class="container">
        ${this.palette.map(
          (color) => html`
            <div
              class="${classMap({
                'color-bubble': true,
                selected: !this.hideHighlight && tinycolor.equals(this.currentColor, color),
              })}"
              style=${styleMap({
                backgroundColor: color,
              })}
              @click=${() => {
                this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: color }))
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
                selected: !this.hideHighlight && !this.palette.find((c) => tinycolor.equals(this.currentColor, c)),
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
    'ic-color-bubbles': ICColorBubbles
  }
}

import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { number } from 'zod/v4'
import { style } from './slider.style'

@customElement('ic-slider')
export class ICSlider extends LitElement {
  static styles = style

  @property({ type: number })
  public value = 0

  @property({ type: number })
  public min = 0

  @property({ type: number })
  public max = 100

  render() {
    return html`
      <input
        id="slider"
        type="range"
        .value=${this.value}
        .min=${this.min}
        .max=${this.max}
        @input=${(e: InputEvent) => {
          const target = e.target as HTMLInputElement
          this.value = Number(target.value)
          this.dispatchEvent(new CustomEvent('change', { detail: this.value }))
        }}
        @change=${(e: InputEvent) => {
          const target = e.target as HTMLInputElement
          this.value = Number(target.value)
          this.dispatchEvent(new CustomEvent('change', { detail: this.value }))
        }}
      />
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-slider': ICSlider
  }
}

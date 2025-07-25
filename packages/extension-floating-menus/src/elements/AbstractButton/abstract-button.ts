import { LitElement, type SVGTemplateResult, html } from 'lit'

import { style } from './abstract-button.style'

export abstract class AbstractButtonElement extends LitElement {
  static styles = style

  protected abstract viewbox: string

  protected abstract icon: SVGTemplateResult

  protected abstract onClick(): void

  render() {
    return html`
      <div class="button" @click="${this.onClick}">
        <svg
          class="icon"
          viewBox="${this.viewbox}"
          fill="currentColor"
        >
          ${this.icon}
        </svg>
      </div>
    `
  }
}

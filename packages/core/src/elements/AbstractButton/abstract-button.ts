import { LitElement, type SVGTemplateResult, html } from 'lit'
import { property } from 'lit/decorators.js'

import { style } from './abstract-button.style'

export abstract class AbstractButtonElement extends LitElement {
  static styles = style

  @property({ type: String })
  public blockId = ''

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

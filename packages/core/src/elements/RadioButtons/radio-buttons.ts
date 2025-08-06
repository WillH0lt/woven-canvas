import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import { style } from './radio-buttons.style'

@customElement('ic-radio-buttons')
export class RadioButtonsElement extends LitElement {
  static styles = style

  @property({ type: Array })
  public buttons: { icon: HTMLTemplateElement; value: string }[] = []

  @property({ type: String })
  public value = ''

  render() {
    return html`
      <div id="container">
        ${this.buttons.map(
          (button) => html`
          <div
            class="button ${classMap({
              'button-selected': this.value === button.value,
            })}"
            @click=${() => this.dispatchEvent(new CustomEvent('change', { detail: button.value }))}
          >
            ${button.icon}
          </div>
        `,
        )}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-radio-buttons': RadioButtonsElement
  }
}

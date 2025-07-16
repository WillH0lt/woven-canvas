import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('ic-shape')
export class ShapeElement extends LitElement {
  // @property({ type: Object }) model?: ShapeModel

  render() {
    return html`
      <div></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-shape': ShapeElement
  }
}

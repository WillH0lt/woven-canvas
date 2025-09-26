import { type HTMLTemplateResult, LitElement, html } from 'lit'
import { state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { style } from './menu-icon-button.style'

export abstract class ICMenuIconButton extends LitElement {
  static styles = style

  @state()
  active = false

  protected abstract icon: HTMLTemplateResult

  protected onClick(): void {
    // no-op
  }

  render() {
    return html`
      <div class="${classMap({
        button: true,
        active: this.active,
      })}" @click="${this.onClick}">
        ${this.icon}
      </div>
    `
  }
}

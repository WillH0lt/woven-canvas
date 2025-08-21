import { type HTMLTemplateResult, LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { style } from './toolbar-icon-button.style'

export abstract class ICToolbarIconButton extends LitElement {
  static styles = style

  protected abstract icon: HTMLTemplateResult

  @property({ type: Boolean })
  public selected = false

  @property()
  public tool = ''

  protected onClick(): void {
    // InfiniteCanvas.instance?.commands.core.setTool(this.tool)
  }

  render() {
    return html`
      <div class="${classMap({
        button: true,
        selected: this.selected,
      })}" @click="${this.onClick}">
        ${this.icon}
      </div>
    `
  }
}

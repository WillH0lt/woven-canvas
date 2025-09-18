import { type HTMLTemplateResult, LitElement, type PropertyValues, html } from 'lit'
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

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)

    this.addEventListener('tool-drag-out', () => this.onToolDragOut())
  }

  protected onClick(): void {
    // InfiniteCanvas.instance?.commands.core.setTool(this.tool)
  }

  protected onToolDragOut(): void {
    // no-op
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

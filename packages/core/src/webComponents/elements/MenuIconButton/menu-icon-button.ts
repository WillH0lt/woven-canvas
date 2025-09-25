import { type HTMLTemplateResult, LitElement, html } from 'lit'
import { state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import type { BaseComponent } from '../../../BaseComponent'
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

  protected readSnapshot<T extends BaseComponent>(comp: new () => BaseComponent): T | undefined {
    // @ts-ignore
    return this.snapshot[this.blockId]?.[comp.name] as T | undefined
  }

  // protected setButtonActive(active: boolean): void {
  //   const button = this.shadowRoot?.querySelector('.button') as HTMLElement | null

  //   if (active) {
  //     button?.classList.add('active')
  //   } else {
  //     button?.classList.remove('active')
  //   }

  //   this.requestUpdate()
  // }
}

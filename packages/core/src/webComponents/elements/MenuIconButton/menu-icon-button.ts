import { type HTMLTemplateResult, LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'

import type { BaseComponent } from '../../../BaseComponent'
import type { Snapshot } from '../../../History'
import { style } from './menu-icon-button.style'

export abstract class ICMenuIconButton extends LitElement {
  static styles = style

  @property({ type: Object })
  public snapshot!: Snapshot

  protected abstract icon: HTMLTemplateResult

  protected onClick(): void {
    // no-op
  }

  render() {
    return html`
      <div class="button" @click="${this.onClick}">
        ${this.icon}
      </div>
    `
  }

  protected readSnapshot<T extends BaseComponent>(comp: new () => BaseComponent): T | undefined {
    // @ts-ignore
    return this.snapshot[this.blockId]?.[comp.name] as T | undefined
  }

  protected setButtonActive(active: boolean): void {
    const button = this.shadowRoot?.querySelector('.button') as HTMLElement | null

    if (active) {
      button?.classList.add('active')
    } else {
      button?.classList.remove('active')
    }

    this.requestUpdate()
  }
}

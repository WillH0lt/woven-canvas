import { type HTMLTemplateResult, html } from 'lit'
import { property } from 'lit/decorators.js'

import type { BaseComponent } from '../../BaseComponent'
import type { Snapshot } from '../../History'
import { ICBaseMenuButton } from '../baseMenuButton'
import { style } from './menu-icon-button.style'

export abstract class ICMenuIconButton extends ICBaseMenuButton {
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
}

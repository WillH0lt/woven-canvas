import { InfiniteCanvas, type TextModel } from '@infinitecanvas/core'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import { BaseElement } from './base'

@customElement('ic-text')
export class TextElement extends SignalWatcher(BaseElement) {
  private model!: ReadonlySignal<TextModel>

  static styles = css`
    p {
      margin: 0;
    }

    p:empty::before {
      content: '';
      display: inline-block;
    }
  `

  public connectedCallback(): void {
    super.connectedCallback()

    this.model = InfiniteCanvas.instance?.store.core.textById(this.blockId) as ReadonlySignal<TextModel>
  }

  render() {
    return html`
    <div style=${styleMap({
      'font-family': this.model.value.fontFamily,
      'text-align': this.model.value.align,
      'line-height': `${this.model.value.lineHeight}`,
      color: `rgba(${this.model.value.red}, ${this.model.value.green}, ${this.model.value.blue}, ${this.model.value.alpha / 255})`,
      'font-size': `${this.model.value.fontSize}px`,
    })}>
      ${unsafeHTML(this.model.value.content)}
    </div>
  `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text': TextElement
  }
}

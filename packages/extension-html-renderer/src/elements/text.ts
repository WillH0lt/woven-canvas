import type { TextModel } from '@infinitecanvas/core'
import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

@customElement('ic-text')
export class TextElement extends LitElement {
  @property({ type: Object }) model!: TextModel
  @property({ type: Number }) fontSize!: number

  static styles = css`
    p {
      margin: 0;
      min-height: 1.2em;
    }

    p:empty::before {
      content: ' ';
      white-space: pre;
    }
  `

  render() {
    return html`
    <div style=${styleMap({
      'font-family': this.model.fontFamily,
      'text-align': this.model.align,
      'line-height': `${this.model.lineHeight}`,
      color: `rgba(${this.model.red}, ${this.model.green}, ${this.model.blue}, ${this.model.alpha / 255})`,
      'font-size': `${this.fontSize}px`,
    })}>
      ${unsafeHTML(this.model.content)}
    </div>
  `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text': TextElement
  }
}

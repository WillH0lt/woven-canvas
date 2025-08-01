import type { Snapshot } from '@infinitecanvas/core'
import type { Color } from '@infinitecanvas/core/components'
import { BaseEditable } from '@infinitecanvas/core/elements'
import type { Text, TextElement } from '@infinitecanvas/extension-text'

import { css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

@customElement('ic-sticky-note')
export class StickyNoteElement extends BaseEditable {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: TextElement

  @property()
  public blockId!: string

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public color!: Color

  static styles = css`
    #container {
      width: 100%;
      padding: 8%;
      aspect-ratio: 1 / 1;
      box-sizing: border-box;
      box-shadow:
        rgba(15, 23, 31, 0.6) 0px 4px 5px -6px,
        rgba(15, 23, 31, 0.4) 0px 11px 13px -12px,
        rgba(15, 23, 44, 0.02) 0px 48px 10px -12px inset;
    }
  `

  render() {
    return html`
      <div id="container" style=${styleMap({
        'background-color': `rgb(${this.color.red}, ${this.color.green}, ${this.color.blue})`,
      })}>
        <ic-text blockId=${this.blockId} .editing=${this.editing} .text=${this.text}></ic-text>
    </div>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    snapshot[this.blockId].Block.width = this.container.clientWidth
    snapshot[this.blockId].Block.height = this.container.clientHeight

    return snapshot
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-sticky-note': StickyNoteElement
  }
}

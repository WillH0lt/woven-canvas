import type { Snapshot } from '@infinitecanvas/core'
import { BaseEditable } from '@infinitecanvas/core/elements'
import type { Color } from '@infinitecanvas/extension-color'
import type { Text, TextElement } from '@infinitecanvas/extension-text'

import { css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { StickyNote } from '../components'
import { VerticalAlign } from '../types'

@customElement('ic-sticky-note')
export class StickyNoteElement extends BaseEditable {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: TextElement

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public color!: Color

  @property({ type: Object })
  public stickyNote!: StickyNote

  static styles = css`
    #container {
      width: 100%;
      display: flex;
      padding: 8%;
      aspect-ratio: 1 / 1;
      box-sizing: border-box;
      box-shadow:
        rgba(16, 24, 32, 0.65) 0px 4px 5px -6px,
        rgba(16, 24, 32, 0.45) 0px 11px 13px -12px,
        rgba(16, 24, 45, 0.025) 0px 45px 10px -12px inset;
    }
  `

  render() {
    const alignStyle =
      {
        [VerticalAlign.Top]: 'flex-start',
        [VerticalAlign.Center]: 'center',
        [VerticalAlign.Bottom]: 'flex-end',
      }[this.stickyNote.verticalAlign] || 'flex-start'

    return html`
      <div id="container" style=${styleMap({
        'background-color': `rgb(${this.color.red}, ${this.color.green}, ${this.color.blue})`,
        'align-items': alignStyle,
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

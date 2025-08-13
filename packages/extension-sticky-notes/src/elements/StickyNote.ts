import type { Snapshot } from '@infinitecanvas/core'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import type { Color } from '@infinitecanvas/extension-color'
import { type ICText, type Text, TextAlign, VerticalAlign } from '@infinitecanvas/extension-text'

import { css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

@customElement('ic-sticky-note')
export class ICStickyNote extends ICEditableBlock {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: ICText

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public color!: Color

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
      }[this.text.verticalAlign] || 'flex-start'

    return html`
      <div id="container" style=${styleMap({
        'background-color': `rgb(${this.color.red}, ${this.color.green}, ${this.color.blue})`,
        'align-items': alignStyle,
      })}>
        <ic-text 
          blockId=${this.blockId}
          .editing=${this.editing}
          .text=${this.text}
          .defaultAlignment=${TextAlign.Center}
        ></ic-text>
    </div>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    const { width, height, left, top } = this.computeBlockDimensions(this.container)

    snapshot[this.blockId].Block.width = width
    snapshot[this.blockId].Block.height = height
    snapshot[this.blockId].Block.left = left
    snapshot[this.blockId].Block.top = top

    return snapshot
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-sticky-note': ICStickyNote
  }
}

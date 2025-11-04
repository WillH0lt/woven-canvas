import { type ICText, type Snapshot, TextAlign, VerticalAlign } from '@infinitecanvas/core'
import type { Text, VerticalAlign as VerticalAlignComp } from '@infinitecanvas/core/components'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import { type PropertyValues, css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import type { Shape } from '../../components/Shape'

@customElement('ascii-shape')
export class AsciiShape extends ICEditableBlock {
  @query('#container') container!: HTMLElement
  @query('ic-text') textElement!: ICText

  @property({ type: Object })
  public text!: Text

  @property({ type: Object })
  public verticalAlign!: VerticalAlignComp

  @property({ type: Object })
  public shape!: Shape

  static styles = [
    ...super.styles,
    css`
      :host * {
        box-sizing: border-box;
      }

      :host([is-hovered]) > :first-child::after,
      :host([is-selected]) > :first-child::after {
        border: none;
      }

      #container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        container-type: inline-size;
      }

      #text {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        padding: 16px;
      }

      @container (max-width: 48px) {
        #text {
          padding: 0;
        }
      }
    `,
  ]

  public firstUpdated(_changedProperties: PropertyValues): void {
    const observer = new ResizeObserver(() => {
      this.requestUpdate()
    })
    observer.observe(this)

    const textObserver = new ResizeObserver(() => {
      if (this.isEditing) {
        this.requestUpdate()
      }
    })
    textObserver.observe(this.textElement)
  }

  render() {
    const alignStyle =
      {
        [VerticalAlign.Top]: 'flex-start',
        [VerticalAlign.Center]: 'center',
        [VerticalAlign.Bottom]: 'flex-end',
      }[this.verticalAlign.value] || 'flex-start'

    return html`
      <div id="container" style=${styleMap({
        'align-items': alignStyle,
      })}>
        <div id="text" style=${styleMap({
          overflow: this.isEditing ? 'visible' : 'hidden',
        })}>
          <ic-text
            blockId=${this.blockId} 
            .isEditing=${this.isEditing} 
            .text=${this.text} 
            .defaultAlignment=${TextAlign.Center}
          ></ic-text>
        </div>
      </div>
    `
  }

  public getSnapshot(): Snapshot {
    const snapshot = this.textElement.getSnapshot()

    return {
      [this.blockId]: {
        Block: {
          width: this.container.clientWidth,
          height: this.container.clientHeight,
        },
        Text: snapshot[this.blockId].Text,
      },
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ascii-shape': AsciiShape
  }
}

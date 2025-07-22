import { InfiniteCanvas, type ShapeModel } from '@infinitecanvas/core'
import type { ReadonlySignal } from '@lit-labs/preact-signals'
import { css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import { BaseElement } from './base'

@customElement('ic-shape')
export class ShapeElement extends BaseElement {
  private model!: ReadonlySignal<ShapeModel>

  static styles = css`
    div {
      width: 100%;
      height: 100%;
    }
  `

  public connectedCallback(): void {
    super.connectedCallback()

    this.model = InfiniteCanvas.instance?.store.core.shapeById(this.blockId) as ReadonlySignal<ShapeModel>
  }

  render() {
    return html`
      <div style=${styleMap({
        'background-color': `rgba(${this.model.value.red}, ${this.model.value.green}, ${this.model.value.blue}, ${this.model.value.alpha / 255})`,
      })}></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-shape': ShapeElement
  }
}

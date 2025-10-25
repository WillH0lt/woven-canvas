import { InfiniteCanvas } from '@infinitecanvas/core'
import { Block, Color, Connector } from '@infinitecanvas/core/components'
import { ICToolbarIconButton } from '@infinitecanvas/core/elements'
import { createSnapshot } from '@infinitecanvas/core/helpers'
import { html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { ArrowTrim, ElbowArrow } from '../../components'
import { ArrowHeadKind } from '../../types'

@customElement('ic-elbow-arrow-tool')
export class ICElbowArrowTool extends ICToolbarIconButton {
  protected icon = html`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3C348.8 149.8 348.8 170.1 361.3 182.6L466.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L466.7 352L361.3 457.4C348.8 469.9 348.8 490.2 361.3 502.7C373.8 515.2 394.1 515.2 406.6 502.7L566.6 342.7z"/></svg>
  `

  protected onClick() {
    InfiniteCanvas.instance?.commands.core.setControls({
      leftMouseTool: 'elbow arrow',
    })
  }

  protected onToolDragOut(): void {
    const block = new Block({
      tag: 'ic-elbow-arrow',
      width: 150,
      height: 150,
    })

    // const fontFamily =
    //   InfiniteCanvas.instance!.store.textEditor.mostRecentFontFamily.value ??
    //   InfiniteCanvas.instance!.config.core.defaultFontFamily

    // const text = new Text({
    //   fontFamily: fontFamily.name,
    //   fontSize: 40,
    // })

    const color = new Color({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 255,
    })

    const arrow = new ElbowArrow({
      points: [0, 1, 0.5, 1, 0.5, 0, 1, 0],
      pointCount: 4,
      endArrowHead: ArrowHeadKind.V,
    })

    const connector = new Connector()

    const arrowTrim = new ArrowTrim()

    const snapshot = createSnapshot(block, [color, arrow, connector, arrowTrim])

    InfiniteCanvas.instance?.commands.core.createAndDragOntoCanvas(snapshot)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-elbow-arrow-tool': ICElbowArrowTool
  }
}

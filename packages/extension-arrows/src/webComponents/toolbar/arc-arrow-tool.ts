import { InfiniteCanvas } from '@infinitecanvas/core'
import { Block, Color, Connector } from '@infinitecanvas/core/components'
import { ICToolbarIconButton } from '@infinitecanvas/core/elements'
import { createSnapshot } from '@infinitecanvas/core/helpers'
import { html } from 'lit'
import { customElement } from 'lit/decorators.js'

import { ArcArrow } from '../../components'
import { ArrowHeadKind } from '../../types'

@customElement('ic-arc-arrow-tool')
export class ICArcArrowTool extends ICToolbarIconButton {
  protected icon = html`
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
    <svg width="100%" height="100%" viewBox="0 0 640 640" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;fill:currentColor;">
        <g transform="matrix(1.34747,0,0,1.34747,-113.491,-69.3983)">
            <path d="M136,64C113.9,64 96,81.9 96,104L96,160C96,177.7 110.3,192 128,192C145.7,192 160,177.7 160,160L160,128L288,128L288,450.191L256,450.191C238.3,450.191 224,464.491 224,482.191C224,499.891 238.3,514.191 256,514.191L384,514.191C401.7,514.191 416,499.891 416,482.191C416,464.491 401.7,450.191 384,450.191L352,450.191L352,128L480,128L480,160C480,177.7 494.3,192 512,192C529.7,192 544,177.7 544,160L544,104C544,81.9 526.1,64 504,64L136,64Z" style="fill-rule:nonzero;"/>
        </g>
    </svg>
  `

  protected onClick() {
    InfiniteCanvas.instance?.commands.core.setControls({
      leftMouseTool: 'arc arrow',
    })
  }

  protected onToolDragOut(): void {
    const block = new Block({
      tag: 'ic-arc-arrow',
      width: 150,
      height: 150,
    })

    // const fontFamily =
    //   InfiniteCanvas.instance!.store.textEditor.mostRecentFontFamily.value ??
    //   InfiniteCanvas.instance!.config.core.defaultFontFamily

    // const text = new Text({
    //   fontFamily: fontFamily.name,
    //   fontSizePx: 40,
    // })

    const color = new Color({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 255,
    })

    const arrow = new ArcArrow({
      a: [0, 1],
      b: [0.5, 0.5],
      c: [1, 0],
      endArrowHead: ArrowHeadKind.V,
    })

    const connector = new Connector()

    const snapshot = createSnapshot(block, [color, arrow, connector])

    InfiniteCanvas.instance?.commands.core.createAndDragOntoCanvas(snapshot)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-arc-arrow-tool': ICArcArrowTool
  }
}

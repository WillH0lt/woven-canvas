import { InfiniteCanvas } from '@infinitecanvas/core'
import { ICMenuIconButton } from '@infinitecanvas/core/elements'
import { type PropertyValues, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { Text } from '../../components'
import { VerticalAlign } from '../../types'

const alignments = [VerticalAlign.Top, VerticalAlign.Center, VerticalAlign.Bottom]

const icons = {
  [VerticalAlign.Top]: html`
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-80v-640h120v640H280Zm280-240v-400h120v400H560ZM80-800v-80h800v80H80Z"/></svg>
  `,
  [VerticalAlign.Center]: html`
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-120v-320H80v-80h200v-320h120v320h160v-200h120v200h200v80H680v200H560v-200H400v320H280Z"/></svg>
  `,
  [VerticalAlign.Bottom]: html`
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M80-80v-80h800v80H80Zm200-160v-640h120v640H280Zm280 0v-400h120v400H560Z"/></svg>
  `,
}

@customElement('ic-text-vertical-alignment-button')
export class ICTextVerticalAlignmentButton extends ICMenuIconButton {
  protected icon = icons[VerticalAlign.Top] // Default icon, will be updated in connected

  public updated(_changedProperties: PropertyValues): void {
    if (!_changedProperties.has('snapshot')) return

    const text = this.readSnapshot<Text>(Text)
    this.icon = icons[text?.verticalAlign ?? VerticalAlign.Top]
    this.requestUpdate()
  }

  protected onClick(): void {
    const text = this.readSnapshot<Text>(Text)
    const currAlign = text?.verticalAlign ?? VerticalAlign.Top
    const nextAlign = alignments[(alignments.indexOf(currAlign) + 1) % alignments.length]
    InfiniteCanvas.instance?.commands.text.setText(this.blockId, { verticalAlign: nextAlign })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-vertical-alignment-button': ICTextVerticalAlignmentButton
  }
}

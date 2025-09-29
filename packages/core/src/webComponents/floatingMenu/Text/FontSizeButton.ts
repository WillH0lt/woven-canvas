import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { customElement } from 'lit/decorators.js'

import { FONT_SIZE_OPTIONS } from '../../../constants'
import { ICMenuDropdownButton } from '../../elements'

@customElement('ic-font-size-button')
export class ICFontSizeButton extends SignalWatcher(ICMenuDropdownButton) {
  render() {
    this.label = this.getFontSizeLabel()
    return super.render()
  }

  private getFontSizeLabel(): string {
    const selectedTexts = InfiniteCanvas.instance?.store.textEditor.selectedTexts.value

    let fontSize: number | 'mixed' | null = null
    for (const text of selectedTexts ?? []) {
      if (fontSize === null) {
        fontSize = text.fontSize
      } else if (fontSize !== text.fontSize) {
        fontSize = 'mixed'
        break
      }
    }

    if (fontSize === null) {
      return ''
    }
    if (fontSize === 'mixed') {
      return 'Mixed'
    }

    const option = FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)
    return option ? option.label : `${+fontSize.toFixed(1)} px`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-size-button': ICFontSizeButton
  }
}

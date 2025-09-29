import { InfiniteCanvas } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { customElement } from 'lit/decorators.js'
import { ICMenuDropdownButton } from '../../elements'

@customElement('ic-font-family-button')
export class ICFontFamilyButton extends SignalWatcher(ICMenuDropdownButton) {
  render() {
    this.label = this.getFontFamilyLabel()
    return super.render()
  }

  private getFontFamilyLabel(): string {
    const selectedTexts = InfiniteCanvas.instance?.store.textEditor.selectedTexts.value

    let fontFamily: string | 'mixed' | null = null
    for (const text of selectedTexts ?? []) {
      if (fontFamily === null) {
        fontFamily = text.fontFamily
      } else if (fontFamily !== text.fontFamily) {
        fontFamily = 'mixed'
        break
      }
    }

    if (fontFamily === null) {
      return ''
    }
    if (fontFamily === 'mixed') {
      return 'Mixed'
    }

    return fontFamily
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-family-button': ICFontFamilyButton
  }
}

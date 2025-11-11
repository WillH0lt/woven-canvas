import { customElement } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { SignalWatcher } from '@lit-labs/preact-signals'

import type { IStore } from '../../../types'
import { FONT_SIZE_OPTIONS } from '../../../constants'
import { storeContext } from '../../contexts'
import { ICMenuDropdownButton } from '../../elements/MenuDropdownButton'

@customElement('ic-font-size-button')
export class ICFontSizeButton extends SignalWatcher(ICMenuDropdownButton) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  render() {
    this.label = this.getFontSizeLabel()
    return super.render()
  }

  private getFontSizeLabel(): string {
    const selectedTexts = this.store.textEditor.selectedTexts.value

    let fontSize: number | 'mixed' | null = null
    for (const text of selectedTexts ?? []) {
      if (fontSize === null) {
        fontSize = text.fontSizePx
      } else if (fontSize !== text.fontSizePx) {
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

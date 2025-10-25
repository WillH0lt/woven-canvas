import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { customElement } from 'lit/decorators.js'
import type { IConfig, IStore } from '../../../types'
import { configContext, storeContext } from '../../contexts'
import { ICMenuDropdownButton } from '../../elements'

@customElement('ic-font-family-button')
export class ICFontFamilyButton extends SignalWatcher(ICMenuDropdownButton) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  render() {
    this.label = this.getFontFamilyLabel()
    return super.render()
  }

  private getFontFamilyLabel(): string {
    const selectedTexts = this.store.textEditor.selectedTexts.value

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

    const fontObject = this.config.textEditor.fontMenu.families.find((f) => f.name === fontFamily)

    console.log('fontObject', fontObject, fontFamily)

    if (fontObject) {
      return fontObject.displayName
    }

    return fontFamily
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-font-family-button': ICFontFamilyButton
  }
}

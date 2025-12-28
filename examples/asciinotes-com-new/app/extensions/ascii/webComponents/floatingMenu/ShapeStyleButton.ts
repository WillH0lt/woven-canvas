import { type IConfig, type IStore, configContext, storeContext } from '@infinitecanvas/core'
import { ICMenuDropdownButton } from '@infinitecanvas/core/elements'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { customElement } from 'lit/decorators.js'

@customElement('ascii-shape-style-button')
export class AsciiShapeStyleButton extends SignalWatcher(ICMenuDropdownButton) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  render() {
    this.label = this.getShapeStyleLabel()
    return super.render()
  }

  private getShapeStyleLabel(): string {
    const selectedShapes = this.store.ascii.selectedShapes.value

    let shapeStyle: string | 'mixed' | null = null
    for (const shape of selectedShapes ?? []) {
      if (shapeStyle === null) {
        shapeStyle = shape.style
      } else if (shapeStyle !== shape.style) {
        shapeStyle = 'mixed'
        break
      }
    }

    if (shapeStyle === null) {
      return ''
    }
    if (shapeStyle === 'mixed') {
      return 'Mixed'
    }

    const style = this.config.ascii.shapeStyles.find((s) => s.key === shapeStyle)
    if (!style) {
      return ''
    }

    return style.displayName
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ascii-shape-style-button': AsciiShapeStyleButton
  }
}

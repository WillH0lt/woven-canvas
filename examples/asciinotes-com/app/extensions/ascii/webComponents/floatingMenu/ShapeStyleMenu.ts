import type { ICommands, IConfig, IStore } from '@infinitecanvas/core'
import { commandsContext, configContext, storeContext } from '@infinitecanvas/core'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { consume } from '@lit/context'
import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import type { Shape } from '../../components'

@customElement('ascii-shape-style-menu')
export class AsciiShapeStyleMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @consume({ context: configContext })
  private config: IConfig = {} as IConfig

  static styles = css`
    .menu-container {
      background-color: var(--ic-gray-700);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
      border-radius: 8px;
      cursor: default;
    }

    .style-list {
      max-height: 200px;
      color: white;
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 8px;
    }

    .style-list > :first-child {
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .style-list > :last-child {
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .style-item {
      display: flex;
      align-items: center;
      height: 15px;
      padding: 8px;
      width: 100%;
      transition: background-color 0.2s;
      cursor: pointer;
    }

    .style-item.active {
      background-color: var(--ic-primary);
    }

    .style-item:not(.active):hover {
      background-color: var(--ic-gray-600);
    }

  `

  private getCurrentShapeStyle(): string | null {
    const selectedShapes = this.store.ascii.selectedShapes.value

    if (!selectedShapes || selectedShapes.length === 0) {
      return null
    }

    const firstShapeStyle = selectedShapes[0].style
    const allSameShapeStyle = selectedShapes.every((shape: Shape) => shape.style === firstShapeStyle)

    return allSameShapeStyle ? firstShapeStyle : null
  }

  private async selectShapeStyle(shapeStyle: string): Promise<void> {
    const shapeStyles = this.config.ascii.shapeStyles

    const matchingStyle = shapeStyles.find((style) => style.key === shapeStyle)
    if (!matchingStyle) {
      console.warn(`Shape style "${shapeStyle}" not found in shape styles.`)
      return
    }

    this.commands.ascii.applyShapeStyleToSelected(shapeStyle)
  }

  private handleWheelStop(e: Event) {
    e.stopPropagation()
  }

  render() {
    const currentShapeStyle = this.getCurrentShapeStyle()
    const shapeStyles = this.config.ascii.shapeStyles

    return html`
      <div class="menu-container" @wheel=${this.handleWheelStop} @click=${(e: Event) => e.stopPropagation()}>
        <div class="style-list">
          ${shapeStyles.map(
            (shapeStyle) => html`
              <div
                class="style-item ${currentShapeStyle === shapeStyle.key ? 'active' : ''}"
                @click=${() => this.selectShapeStyle(shapeStyle.key)}
              >
                ${shapeStyle.displayName}
              </div>
            `,
          )}
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ascii-shape-style-menu': AsciiShapeStyleMenu
  }
}

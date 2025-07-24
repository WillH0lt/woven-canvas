import { InfiniteCanvas } from '@infinitecanvas/core'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import tinycolor from 'tinycolor2'

const PALETTE = ['#000000', '#434343', '#ff3e41', '#ff8a43', '#ffeb7f', '#00c9a7', '#007ea7', '#6a58f2', '#ffffff']

@customElement('ic-text-color-menu')
export class TextColorMenuElement extends SignalWatcher(LitElement) {
  static styles = css`
    .container {
      display: grid;
      grid-auto-flow: column;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 8px;
      padding: 8px;
      border-radius: var(--ic-floating-menus-border-radius);
      justify-content: center;
      background-color: var(--ic-floating-menus-gray-700);
    }

    .color-bubble {
      width: 20px;
      height: 20px;
      border-radius: 9999px;
      outline-style: solid;
      outline-width: 1px;
      outline-color: #ffffff55;
    }

    .color-bubble.selected {
      outline-width: 2px !important;
      outline-color: var(--ic-floating-menus-primary-color) !important;
      outline-offset: 2px !important;
    }

    .rainbow {
      background: radial-gradient(50% 50% at 50% 50%, #ffffff 0%, transparent 100%),
        conic-gradient(
          from 0deg at 50% 50%,
          red,
          #ffa800 47.73deg,
          #ff0 79.56deg,
          #0f0 121.33deg,
          #0ff 180.99deg,
          #00f 238.67deg,
          #f0f 294.36deg,
          red 360deg
        ),
        #c4c4c4;
    }
  `

  @state() private colorPickerOpen = false

  private currentColor!: ReadonlySignal<string>

  public connectedCallback(): void {
    super.connectedCallback()

    this.currentColor = InfiniteCanvas.instance?.store.textEditor.color as ReadonlySignal<string>
  }

  render() {
    return html`
      ${
        this.colorPickerOpen
          ? html`
            <ic-color-picker 
              value=${this.currentColor.value}
              @change=${(e: CustomEvent<string>) => {
                InfiniteCanvas.instance?.commands.textEditor.setColor(e.detail)
              }}
            ></ic-color-picker>`
          : html`
          <div class="container">
            ${PALETTE.map(
              (color) => html`
                <div
                  class="${classMap({
                    'color-bubble': true,
                    selected: tinycolor.equals(this.currentColor.value, color),
                  })}"
                  style=${styleMap({
                    backgroundColor: color,
                  })}
                  @click=${() => {
                    InfiniteCanvas.instance?.commands.textEditor.setColor(color)
                  }}
                ></div>
              `,
            )}
            <div
              class="${classMap({
                'color-bubble': true,
                rainbow: true,
                selected: !PALETTE.find((c) => tinycolor.equals(this.currentColor.value, c)),
              })}"
              @click=${() => {
                this.colorPickerOpen = true
                this.requestUpdate()
              }}
            ></div>
          </div>
      `
      }

      
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text-color-menu': TextColorMenuElement
  }
}

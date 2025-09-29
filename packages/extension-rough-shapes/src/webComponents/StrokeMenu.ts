import { type ICommands, type IStore, commandsContext, storeContext } from '@infinitecanvas/core'
import { Color } from '@infinitecanvas/core/components'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { type HTMLTemplateResult, LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { consume } from '@lit/context'
import type { RoughShape } from '../components'
import { ShapeStrokeKind } from '../types'
import { none, strokeDashed, strokeDotted, strokeSolid } from './icons'

const strokeStyles = {
  [ShapeStrokeKind.Solid]: strokeSolid,
  [ShapeStrokeKind.Dotted]: strokeDotted,
  [ShapeStrokeKind.Dashed]: strokeDashed,
  [ShapeStrokeKind.None]: none,
}

function getStrokeHex(roughShape: RoughShape): string {
  return new Color({
    red: roughShape.strokeRed,
    green: roughShape.strokeGreen,
    blue: roughShape.strokeBlue,
    alpha: roughShape.strokeAlpha,
  }).toHex()
}

@customElement('ic-rough-shape-stroke-menu')
export class ICStrokeMenu extends SignalWatcher(LitElement) {
  @consume({ context: storeContext })
  private store: IStore = {} as IStore

  @consume({ context: commandsContext })
  private commands: ICommands = {} as ICommands

  @state()
  private pickerVisible = false

  render() {
    const roughShapes = this.store.roughShapes.selectedRoughShapes.value
    if (!roughShapes?.length) return nothing
    const roughShape = roughShapes[0]

    return html`
      <ic-menu-container>
        ${this.pickerVisible ? this.colorPicker(roughShape) : this.strokeMenu(roughShape)}
      </ic-menu-container>
    `
  }

  private strokeMenu(roughShape: RoughShape): HTMLTemplateResult {
    const strokeKinds = Object.values(ShapeStrokeKind)

    const color = getStrokeHex(roughShape)

    return html`
      <ic-label>Stroke Style</ic-label>
      <ic-radio-buttons
        .buttons=${strokeKinds.map((kind) => ({
          icon: strokeStyles[kind],
          value: kind,
        }))}
        .value=${roughShape.strokeKind}
        @change=${(e: CustomEvent<string>) => {
          this.applyUpdate({ strokeKind: e.detail as ShapeStrokeKind })
        }}
      ></ic-radio-buttons>

      <ic-label>Stroke Width</ic-label>
      <ic-slider
        .value=${roughShape.strokeWidth}
        min="1"
        max="20"
        @change=${(e: CustomEvent<number>) => {
          this.applyUpdate({
            strokeWidth: e.detail,
          })
        }}
      ></ic-slider>
      <ic-label>Sloppiness</ic-label>
      <ic-slider
        .value=${roughShape.roughness}
        min="0"
        max="10"
        @change=${(e: CustomEvent<number>) => {
          this.applyUpdate({
            roughness: e.detail,
          })
        }}
      ></ic-slider>

      <ic-label>Stroke Color</ic-label>

      <ic-color-bubbles
        withPicker="true"
        .currentColor=${color}
        @change=${(e: CustomEvent<string>) => {
          const color = new Color().fromHex(e.detail)

          this.applyUpdate({
            strokeRed: color.red,
            strokeGreen: color.green,
            strokeBlue: color.blue,
            strokeAlpha: color.alpha,
          })
        }}
        @show-picker=${() => {
          this.pickerVisible = true
        }}
      ></ic-color-bubbles>
    `
  }

  private colorPicker(roughShape: RoughShape): HTMLTemplateResult {
    const hex = getStrokeHex(roughShape)

    return html`
      <ic-color-picker
        value=${hex}
        @change=${(e: CustomEvent<string>) => {
          const color = new Color().fromHex(e.detail)
          this.applyUpdate({
            strokeRed: color.red,
            strokeGreen: color.green,
            strokeBlue: color.blue,
            strokeAlpha: color.alpha,
          })
        }}
      ></ic-color-picker>
    `
  }

  private applyUpdate(roughShape: Partial<RoughShape>): void {
    this.commands.roughShapes.applyRoughShapeToSelection(roughShape)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape-stroke-menu': ICStrokeMenu
  }
}

import { type ICommands, type IStore, commandsContext, storeContext } from '@infinitecanvas/core'
import { Color } from '@infinitecanvas/core/components'
import { SignalWatcher } from '@lit-labs/preact-signals'
import { type HTMLTemplateResult, LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { consume } from '@lit/context'
import type { RoughShape } from '../components'
import { ShapeFillKind } from '../types'
import { fillCrossHatch, fillHachure, fillSolid, none } from './icons'

const fillStyles = {
  [ShapeFillKind.Solid]: fillSolid,
  [ShapeFillKind.Hachure]: fillHachure,
  [ShapeFillKind.CrossHatch]: fillCrossHatch,
  [ShapeFillKind.None]: none,
}

function getFillHex(roughShape: RoughShape): string {
  return new Color({
    red: roughShape.fillRed,
    green: roughShape.fillGreen,
    blue: roughShape.fillBlue,
    alpha: roughShape.fillAlpha,
  }).toHex()
}

@customElement('ic-rough-shape-fill-menu')
export class ICFillMenu extends SignalWatcher(LitElement) {
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
        ${this.pickerVisible ? this.colorPicker(roughShape) : this.fillMenu(roughShape)}      
      </ic-menu-container>
    `
  }

  private fillMenu(roughShape: RoughShape): HTMLTemplateResult {
    const fillKinds = Object.values(ShapeFillKind)

    const hex = getFillHex(roughShape)

    const showHachureOptions = [ShapeFillKind.Hachure, ShapeFillKind.CrossHatch].includes(roughShape.fillKind)

    return html`
      <ic-label>Fill Style</ic-label>
      <ic-radio-buttons
        .buttons=${fillKinds.map((kind) => ({
          icon: fillStyles[kind],
          value: kind,
        }))}
        .value=${roughShape.fillKind}
        @change=${(e: CustomEvent<string>) => {
          this.applyUpdate({ fillKind: e.detail as ShapeFillKind })
        }}
      ></ic-radio-buttons>

      ${showHachureOptions ? this.hachureOptions(roughShape.fillWidth, roughShape.hachureGap, roughShape.hachureAngle) : nothing}
      <ic-label>Fill Color</ic-label>

      <ic-color-bubbles
        withPicker="true"
        .currentColor=${hex}
        @change=${(e: CustomEvent<string>) => {
          const color = new Color().fromHex(e.detail)

          this.applyUpdate({
            fillRed: color.red,
            fillGreen: color.green,
            fillBlue: color.blue,
            fillAlpha: color.alpha,
          })
        }}
        @show-picker=${() => {
          this.pickerVisible = true
        }}
      ></ic-color-bubbles>
    `
  }

  private hachureOptions(fillWidth: number, hachureGap: number, hachureAngle: number): HTMLTemplateResult {
    return html`
      <ic-label>Stroke Width</ic-label>
      <ic-slider
        .value=${fillWidth}
        min="1"
        max="20"
        @change=${(e: CustomEvent<number>) => {
          this.applyUpdate({
            fillWidth: e.detail,
          })
        }}
      ></ic-slider>
      <ic-label>Hachure Gap</ic-label>
      <ic-slider
        .value=${hachureGap}
        min="5"
        max="60"
        @change=${(e: CustomEvent<number>) => {
          this.applyUpdate({
            hachureGap: e.detail,
          })
        }}
      ></ic-slider>
      <ic-label>Hachure Angle</ic-label>
      <ic-slider
        .value=${hachureAngle}
        min="0"
        max="180"
        @change=${(e: CustomEvent<number>) => {
          this.applyUpdate({
            hachureAngle: e.detail,
          })
        }}
      ></ic-slider>
    `
  }

  private colorPicker(roughShape: RoughShape): HTMLTemplateResult {
    const hex = getFillHex(roughShape)

    return html`
      <ic-color-picker
        value=${hex}
        @change=${(e: CustomEvent<string>) => {
          const color = new Color().fromHex(e.detail)
          this.applyUpdate({
            fillRed: color.red,
            fillGreen: color.green,
            fillBlue: color.blue,
            fillAlpha: color.alpha,
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
    'ic-rough-shape-fill-menu': ICFillMenu
  }
}

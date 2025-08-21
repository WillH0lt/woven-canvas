import { InfiniteCanvas } from '@infinitecanvas/core'
import { ICBaseMenuButton } from '@infinitecanvas/core/elements'
import { Color } from '@infinitecanvas/extension-color'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { type HTMLTemplateResult, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import type { RoughShape } from '../components'
import { ShapeStrokeKind } from '../types'
import { none, strokeDashed, strokeDotted, strokeSolid } from './icons'

const strokeStyles = {
  [ShapeStrokeKind.Solid]: strokeSolid,
  [ShapeStrokeKind.Dotted]: strokeDotted,
  [ShapeStrokeKind.Dashed]: strokeDashed,
  [ShapeStrokeKind.None]: none,
}

@customElement('ic-rough-shape-stroke-menu')
export class ICStrokeMenu extends SignalWatcher(ICBaseMenuButton) {
  @state()
  private pickerVisible = false

  private roughShape!: ReadonlySignal<RoughShape | undefined>
  private get strokeColor(): string {
    if (!this.roughShape.value) {
      return '#000000'
    }

    const value = this.roughShape.value
    return new Color()
      .fromJson({
        red: value.strokeRed,
        green: value.strokeGreen,
        blue: value.strokeBlue,
        alpha: value.strokeAlpha,
      })
      .toHex()
  }

  public connectedCallback(): void {
    super.connectedCallback()
    this.roughShape = InfiniteCanvas.instance!.store.roughShapes.roughShapeById(this.blockId)
  }

  render() {
    return html`
      <ic-menu-container>
        ${this.pickerVisible ? this.colorPicker() : this.strokeMenu()}      
      </ic-menu-container>
    `
  }

  private strokeMenu(): HTMLTemplateResult {
    const strokeKinds = Object.values(ShapeStrokeKind)

    return html`
      <ic-label>Stroke Style</ic-label>
      <ic-radio-buttons
        .buttons=${strokeKinds.map((kind) => ({
          icon: strokeStyles[kind],
          value: kind,
        }))}
        .value=${this.roughShape.value?.strokeKind}
        @change=${(e: CustomEvent<string>) => {
          this.applyUpdate({ strokeKind: e.detail as ShapeStrokeKind })
        }}
      ></ic-radio-buttons>

      <ic-label>Stroke Width</ic-label>
      <ic-slider
        .value=${this.roughShape.value?.strokeWidth}
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
        .value=${this.roughShape.value?.roughness}
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
        .currentColor=${this.strokeColor}
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

  private colorPicker(): HTMLTemplateResult {
    return html`
      <ic-color-picker
        value=${this.strokeColor}
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

  private applyUpdate(updates: Partial<RoughShape>): void {
    InfiniteCanvas.instance!.commands.roughShapes.setRoughShape(this.blockId, updates)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape-stroke-menu': ICStrokeMenu
  }
}

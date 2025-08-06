import { InfiniteCanvas } from '@infinitecanvas/core'
import { BaseElement } from '@infinitecanvas/core/elements'
import { colorToHex, hexToColor } from '@infinitecanvas/core/helpers'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { type HTMLTemplateResult, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import type { RoughShape } from '../components'
import { ShapeFillKind } from '../types'
import { fillCrossHatch, fillHachure, fillSolid, none } from './icons'

const fillStyles = {
  [ShapeFillKind.Solid]: fillSolid,
  [ShapeFillKind.Hachure]: fillHachure,
  [ShapeFillKind.CrossHatch]: fillCrossHatch,
  [ShapeFillKind.None]: none,
}

@customElement('ic-rough-shape-fill-menu')
export class FillMenuElement extends SignalWatcher(BaseElement) {
  @state()
  private pickerVisible = false

  private roughShape!: ReadonlySignal<RoughShape | undefined>
  private get fillColor(): string {
    if (!this.roughShape.value) {
      return '#000000'
    }

    const value = this.roughShape.value
    return colorToHex({
      red: value.fillRed,
      green: value.fillGreen,
      blue: value.fillBlue,
      alpha: value.fillAlpha,
    })
  }

  private get showHachureOptions(): boolean {
    const shape = this.roughShape.value
    if (!shape) return false
    return [ShapeFillKind.Hachure, ShapeFillKind.CrossHatch].includes(shape.fillKind)
  }

  public connectedCallback(): void {
    super.connectedCallback()
    this.roughShape = InfiniteCanvas.instance!.store.roughShapes.roughShapeById(this.blockId)
  }

  render() {
    return html`
      <ic-menu-container>
        ${this.pickerVisible ? this.colorPicker() : this.fillMenu()}      
      </ic-menu-container>
    `
  }

  private fillMenu(): HTMLTemplateResult {
    const fillKinds = Object.values(ShapeFillKind)

    return html`
      <ic-label>Fill Style</ic-label>
      <ic-radio-buttons
        .buttons=${fillKinds.map((kind) => ({
          icon: fillStyles[kind],
          value: kind,
        }))}
        .value=${this.roughShape.value?.fillKind}
        @change=${(e: CustomEvent<string>) => {
          this.applyUpdate({ fillKind: e.detail as ShapeFillKind })
        }}
      ></ic-radio-buttons>

      ${this.showHachureOptions ? this.hachureOptions() : nothing}
      <ic-label>Fill Color</ic-label>

      <ic-color-bubbles
        withPicker="true"
        .currentColor=${this.fillColor}
        @change=${(e: CustomEvent<string>) => {
          const color = hexToColor(e.detail)

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

  private hachureOptions(): HTMLTemplateResult {
    return html`
      <ic-label>Stroke Width</ic-label>
      <ic-slider
        .value=${this.roughShape.value?.fillWidth}
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
        .value=${this.roughShape.value?.hachureGap}
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
        .value=${this.roughShape.value?.hachureAngle}
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

  private colorPicker(): HTMLTemplateResult {
    return html`
      <ic-color-picker
        value=${this.fillColor}
        @change=${(e: CustomEvent<string>) => {
          const color = hexToColor(e.detail)
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

  private applyUpdate(updates: Partial<RoughShape>): void {
    InfiniteCanvas.instance!.commands.roughShapes.set(this.blockId, updates)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-rough-shape-fill-menu': FillMenuElement
  }
}

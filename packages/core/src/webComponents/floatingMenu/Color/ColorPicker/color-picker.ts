import { clamp } from '@infinitecanvas/core/helpers'
import { LitElement, html } from 'lit'
import { customElement, eventOptions, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'
import Tinycolor from 'tinycolor2'

import { drag } from '../helpers/drag.js'
import { watch } from '../helpers/watch.js'
import { style } from './color-picker.style.js'

/**
 *
 * @event change - Emitted when the color picker's value changes.
 *
 * @csspart base - The component's base wrapper.
 * @csspart grid - The color grid.
 * @csspart grid-handle - The color grid's handle.
 * @csspart slider - Hue and opacity sliders.
 * @csspart slider-handle - Hue and opacity slider handles.
 * @csspart hue-slider - The hue slider.
 * @csspart hue-slider-handle - The hue slider's handle.
 * @csspart opacity-slider - The opacity slider.
 * @csspart opacity-slider-handle - The opacity slider's handle.
 * @csspart input - The text input.
 *
 * @cssproperty --grid-width - The width of the color grid.
 * @cssproperty --grid-height - The height of the color grid.
 * @cssproperty --grid-handle-size - The size of the color grid's handle.
 * @cssproperty --slider-height - The height of the hue and alpha sliders.
 * @cssproperty --slider-handle-size - The diameter of the slider's handle.
 */
@customElement('ic-color-picker')
export class ICColorPicker extends LitElement {
  static styles = style

  private isSafeValue = false

  @state() private isDraggingGridHandle = false
  @state() private isEmpty = true
  @state() private inputValue = ''
  @state() private hue = 0
  @state() private saturation = 100
  @state() private brightness = 100
  @state() private alpha = 100

  private _value: string | null = null
  private valueHasChanged = false

  /** The current value of the input, submitted as a name/value pair with form data. */
  get value() {
    if (this.valueHasChanged) {
      return this._value
    }

    return this._value ?? this.defaultValue
  }

  /**
   * The current value of the color picker. The value's format will vary based the `format` attribute. To get the value
   * in a specific format, use the `getFormattedValue()` method. The value is submitted as a name/value pair with form
   * data.
   */

  @state() set value(val: string | null) {
    if (this._value === val) {
      return
    }

    this.valueHasChanged = true
    this._value = val
  }

  /** The default value of the form control. Primarily used for resetting the form control. */
  @property({ attribute: 'value', reflect: true }) defaultValue: string | null = this.getAttribute('value') || null

  /**
   * The color picker's label. This will not be displayed, but it will be announced by assistive devices. If you need to
   * display HTML, you can use the `label` slot` instead.
   */
  @property() label = ''

  /**
   * The color picker's hint. If you need to display HTML, use the `hint` slot instead.
   */
  @property({ attribute: 'hint' }) hint = ''

  /** The name of the form control, submitted as a name/value pair with form data. */
  @property({ reflect: true }) name: string | null = null

  /** Disables the color picker. */
  @property({ type: Boolean }) disabled = false

  /** Shows the opacity slider. Enabling this will cause the formatted value to be HEXA, RGBA, or HSLA. */
  @property({ type: Boolean }) opacity = false

  /** By default, values are lowercase. With this attribute, values will be uppercase instead. */
  @property({ type: Boolean }) uppercase = false

  /**
   * By default, form controls are associated with the nearest containing `<form>` element. This attribute allows you
   * to place the form control outside of a form and associate it with the form that has this `id`. The form must be in
   * the same document or shadow root for this to work.
   */
  @property({ reflect: true }) form = null

  /** Makes the color picker a required field. */
  @property({ type: Boolean, reflect: true }) required = false

  private handleAlphaDrag(event: PointerEvent) {
    const container = this.shadowRoot!.querySelector<HTMLElement>('.slider.alpha')!
    const handle = container.querySelector<HTMLElement>('.slider-handle')!
    const { width } = container.getBoundingClientRect()
    let initialValue = this.value
    let currentValue = this.value

    handle.focus()
    event.preventDefault()

    drag(container, {
      onMove: (x) => {
        this.alpha = clamp((x / width) * 100, 0, 100)
        this.syncValues()

        if (this.value !== currentValue) {
          currentValue = this.value
        }
      },
      onStop: () => {
        if (this.value !== initialValue) {
          initialValue = this.value
        }
      },
      initialEvent: event,
    })
  }

  private handleHueDrag(event: PointerEvent) {
    const container = this.shadowRoot!.querySelector<HTMLElement>('.slider.hue')!
    const handle = container.querySelector<HTMLElement>('.slider-handle')!
    const { width } = container.getBoundingClientRect()
    let initialValue = this.value
    let currentValue = this.value

    handle.focus()
    event.preventDefault()

    drag(container, {
      onMove: (x) => {
        this.hue = clamp((x / width) * 360, 0, 360)
        this.syncValues()

        if (this.value !== currentValue) {
          currentValue = this.value
        }
      },
      onStop: () => {
        if (this.value !== initialValue) {
          initialValue = this.value
        }
      },
      initialEvent: event,
    })
  }

  private handleGridDrag(event: PointerEvent) {
    const grid = this.shadowRoot!.querySelector<HTMLElement>('.grid')!
    const handle = grid.querySelector<HTMLElement>('.grid-handle')!
    const { width, height } = grid.getBoundingClientRect()
    let initialValue = this.value
    let currentValue = this.value

    handle.focus()
    event.preventDefault()

    this.isDraggingGridHandle = true

    drag(grid, {
      onMove: (x, y) => {
        this.saturation = clamp((x / width) * 100, 0, 100)
        this.brightness = clamp(100 - (y / height) * 100, 0, 100)
        this.syncValues()

        if (this.value !== currentValue) {
          currentValue = this.value
        }
      },
      onStop: () => {
        this.isDraggingGridHandle = false
        if (this.value !== initialValue) {
          initialValue = this.value
        }
      },
      initialEvent: event,
    })
  }

  private handleAlphaKeyDown(event: KeyboardEvent) {
    const increment = event.shiftKey ? 10 : 1

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      this.alpha = clamp(this.alpha - increment, 0, 100)
      this.syncValues()
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      this.alpha = clamp(this.alpha + increment, 0, 100)
      this.syncValues()
    }

    if (event.key === 'Home') {
      event.preventDefault()
      this.alpha = 0
      this.syncValues()
    }

    if (event.key === 'End') {
      event.preventDefault()
      this.alpha = 100
      this.syncValues()
    }
  }

  private handleHueKeyDown(event: KeyboardEvent) {
    const increment = event.shiftKey ? 10 : 1

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      this.hue = clamp(this.hue - increment, 0, 360)
      this.syncValues()
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      this.hue = clamp(this.hue + increment, 0, 360)
      this.syncValues()
    }

    if (event.key === 'Home') {
      event.preventDefault()
      this.hue = 0
      this.syncValues()
    }

    if (event.key === 'End') {
      event.preventDefault()
      this.hue = 360
      this.syncValues()
    }
  }

  private handleGridKeyDown(event: KeyboardEvent) {
    const increment = event.shiftKey ? 10 : 1

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      this.saturation = clamp(this.saturation - increment, 0, 100)
      this.syncValues()
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      this.saturation = clamp(this.saturation + increment, 0, 100)
      this.syncValues()
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.brightness = clamp(this.brightness + increment, 0, 100)
      this.syncValues()
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.brightness = clamp(this.brightness - increment, 0, 100)
      this.syncValues()
    }
  }

  private handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement
    event.stopPropagation()

    if (target.value) {
      this.setColor(target.value)
      target.value = this.value || ''
    } else {
      this.value = ''
    }
  }

  private handleInputKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement

    if (event.key === 'Enter') {
      if (target.value) {
        this.setColor(target.value)
        target.value = this.value || ''

        setTimeout(() => target.select())
      } else {
        this.hue = 0
      }
    }
  }

  private handleInputInput(event: InputEvent) {
    const target = event.target as HTMLInputElement
    event.stopPropagation()

    if (target.value.length === 7 && new Tinycolor(target.value).isValid()) {
      this.setColor(target.value)
      target.value = this.value || ''

      setTimeout(() => target.focus())
    }
  }

  @eventOptions({ passive: false })
  private handleTouchMove(event: TouchEvent) {
    event.preventDefault()
  }

  private parseColor(colorString: string) {
    if (!colorString || colorString.trim() === '') {
      return null
    }

    const color = new Tinycolor(colorString)
    if (!color.isValid) {
      return null
    }

    const rgb = color.toRgb()
    const hsvColor = color.toHsv()

    // Checks for null RGB values
    if (!rgb || rgb.r == null || rgb.g == null || rgb.b == null) {
      return null
    }

    const hex = color.toHexString()
    const hexa = color.toHex8String()

    // Adjust saturation and value from 0-1 to 0-100
    const hsv = {
      h: hsvColor.h || 0,
      s: (hsvColor.s || 0) * 100,
      v: (hsvColor.v || 0) * 100,
      a: hsvColor.a || 0,
    }

    return {
      hsva: {
        h: hsv.h,
        s: hsv.s,
        v: hsv.v,
        a: hsv.a,
        string: this.setLetterCase(
          `hsva(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%, ${hsv.a.toFixed(2).toString()})`,
        ),
      },
      hex: this.setLetterCase(hex),
      hexa: this.setLetterCase(hexa),
    }
  }

  private setColor(colorString: string) {
    const newColor = this.parseColor(colorString)

    if (newColor === null) {
      return false
    }

    this.hue = newColor.hsva.h
    this.saturation = newColor.hsva.s
    this.brightness = newColor.hsva.v
    this.alpha = this.opacity ? newColor.hsva.a * 100 : 100

    this.syncValues()

    return true
  }

  private setLetterCase(string: string) {
    if (typeof string !== 'string') {
      return ''
    }
    return this.uppercase ? string.toUpperCase() : string.toLowerCase()
  }

  private async syncValues() {
    const currentColor = this.parseColor(
      `hsva(${this.hue}, ${this.saturation}%, ${this.brightness}%, ${this.alpha / 100})`,
    )

    if (currentColor === null) {
      return
    }

    // Update the value
    this.inputValue = this.opacity ? currentColor.hexa : currentColor.hex

    // Setting this.value will trigger the watcher which parses the new value. We want to bypass that behavior because
    // we've already parsed the color here and conversion/rounding can lead to values changing slightly. When this
    // happens, dragging the grid handle becomes jumpy. After the next update, the usual behavior is restored.
    this.isSafeValue = true
    this.value = this.inputValue

    this.requestUpdate()

    await this.updateComplete
    this.isSafeValue = false

    this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: this.value }))
  }

  /** Generates a hex string from HSV values. Hue must be 0-360. All other arguments must be 0-100. */
  getHexString(hue: number, saturation: number, brightness: number, alpha = 100) {
    const color = new Tinycolor(`hsva(${hue}, ${saturation}%, ${brightness}%, ${alpha / 100})`)
    if (!color.isValid) {
      return ''
    }

    return color.toHex8String()
  }

  // Prevents nested components from leaking events
  private stopNestedEventPropagation(event: CustomEvent) {
    event.stopImmediatePropagation()
  }

  @watch('opacity')
  handleOpacityChange() {
    this.alpha = 100
  }

  @watch('value')
  handleValueChange(oldValue: any, newValue: any) {
    const oldVal = oldValue as string | undefined
    const newVal = newValue as string
    this.isEmpty = !newVal

    if (!newVal) {
      this.hue = 0
      this.saturation = 0
      this.brightness = 100
      this.alpha = 100
    }

    if (!this.isSafeValue) {
      const newColor = this.parseColor(newVal)

      if (newColor !== null) {
        this.inputValue = this.value || ''
        this.hue = newColor.hsva.h
        this.saturation = newColor.hsva.s
        this.brightness = newColor.hsva.v
        this.alpha = newColor.hsva.a * 100
        this.syncValues()
      } else {
        this.inputValue = oldVal ?? ''
      }
    }

    this.requestUpdate()
  }

  /** Returns the current value as a string in the specified format. */
  getFormattedValue(format: 'hex' | 'hexa' = 'hex') {
    const currentColor = this.parseColor(
      `hsva(${this.hue}, ${this.saturation}%, ${this.brightness}%, ${this.alpha / 100})`,
    )

    if (currentColor === null) {
      return ''
    }

    switch (format) {
      case 'hex':
        return currentColor.hex
      case 'hexa':
        return currentColor.hexa
      default:
        return ''
    }
  }

  render() {
    const gridHandleX = this.saturation
    const gridHandleY = 100 - this.brightness

    return html`
      <div
        part="base"
        class=${classMap({
          'color-picker': true,
        })}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        tabindex="-1"
      >

        <div class="user-input" aria-live="polite">
          <input
            part="input"
            type="text"
            name=${this.name}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            .value=${this.isEmpty ? '' : this.inputValue}
            ?required=${this.required}
            ?disabled=${this.disabled}
            aria-label="current value"
            @keydown=${this.handleInputKeyDown}
            @change=${this.handleInputChange}
            @input=${this.handleInputInput}
            @blur=${this.stopNestedEventPropagation}
            @focus=${this.stopNestedEventPropagation}
          />
        </div>

        <div class="controls">
          <div class="sliders">
            <div
              part="slider hue-slider"
              class="hue slider"
              @pointerdown=${this.handleHueDrag}
              @touchmove=${this.handleTouchMove}
            >
              <span
                part="slider-handle hue-slider-handle"
                class="slider-handle"
                style=${styleMap({
                  left: `${this.hue === 0 ? 0 : 100 / (360 / this.hue)}%`,
                  backgroundColor: this.getHexString(this.hue, 100, 100),
                })}
                role="slider"
                aria-label="hue"
                aria-orientation="horizontal"
                aria-valuemin="0"
                aria-valuemax="360"
                aria-valuenow=${`${Math.round(this.hue)}`}
                tabindex=${ifDefined(this.disabled ? undefined : '0')}
                @keydown=${this.handleHueKeyDown}
              ></span>
            </div>

            ${
              this.opacity
                ? html`
                  <div
                    part="slider opacity-slider"
                    class="alpha slider transparent-bg"
                    @pointerdown="${this.handleAlphaDrag}"
                    @touchmove=${this.handleTouchMove}
                  >
                    <div
                      class="alpha-gradient"
                      style=${styleMap({
                        backgroundImage: `linear-gradient(
                          to right,
                          ${this.getHexString(this.hue, this.saturation, this.brightness, 0)} 0%,
                          ${this.getHexString(this.hue, this.saturation, this.brightness, 100)} 100%
                        )`,
                      })}
                    ></div>
                    <span
                      part="slider-handle opacity-slider-handle"
                      class="slider-handle"
                      style=${styleMap({
                        left: `${this.alpha}%`,
                        backgroundColor: this.getHexString(this.hue, this.saturation, this.brightness, this.alpha),
                      })}
                      role="slider"
                      aria-label="alpha"
                      aria-orientation="horizontal"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow=${Math.round(this.alpha)}
                      tabindex=${ifDefined(this.disabled ? undefined : '0')}
                      @keydown=${this.handleAlphaKeyDown}
                    ></span>
                  </div>
                `
                : ''
            }
          </div>
        </div>

        <div
          part="grid"
          class="grid"
          style=${styleMap({ backgroundColor: this.getHexString(this.hue, 100, 100) })}
          @pointerdown=${this.handleGridDrag}
          @touchmove=${this.handleTouchMove}
        >
          <span
            part="grid-handle"
            class=${classMap({
              'grid-handle': true,
              'grid-handle-dragging': this.isDraggingGridHandle,
            })}
            style=${styleMap({
              top: `${gridHandleY}%`,
              left: `${gridHandleX}%`,
              backgroundColor: this.getHexString(this.hue, this.saturation, this.brightness, this.alpha),
            })}
            role="application"
            aria-label="HSV"
            tabindex=${ifDefined(this.disabled ? undefined : '0')}
            @keydown=${this.handleGridKeyDown}
          ></span>
        </div>
      </div>
    `
  }
}

import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { LitElement, type PropertyValues, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { html, unsafeStatic } from 'lit/static-html.js'
import type { z } from 'zod'

import type { Button } from '../types'

@customElement('ic-floating-menu')
export class FloatingMenuElement extends LitElement {
  @property({ type: Array })
  public buttons: Array<z.infer<typeof Button>> = []

  private tooltipTimeout: number | null = null
  private isTooltipVisible = false

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: auto;
    }

    .container {
      display: flex;
      cursor: pointer;
      height: 100%;
      color: white;
      background-color: #060607;
      border-radius: 12px;
    }

    .container *:first-child {
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }

    .container *:last-child {
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    .container * {
      width: 100%;
      height: 100%;
      transition-property: background-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }

    .container *:hover {
      background-color: #2e3338;
    }

    #tooltip {
      display: none;
      width: max-content;
      position: absolute;
      top: 0;
      left: 0;
      background: #060607;
      color: white;
      font-weight: bold;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 70%;
    }
  `

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)

    this.addEventListener('pointerdown', (e) => e.stopPropagation())
  }

  render() {
    return html`
      <div class="container" @mouseleave="${() => this.hideTooltip()}">
        ${this.buttons.map(
          (button) => html`
            <${unsafeStatic(button.tag)}
              style="width: ${button.width}px"
              @mouseenter="${() => this.onMouseEnter(button)}"
            />
          `,
        )}
      </div>
      <div id="tooltip" role="tooltip">My tooltip</div>
    `
  }

  handleButtonClick() {
    console.log('Button clicked!')
  }

  onMouseEnter(button: z.infer<typeof Button>) {
    const tooltip = this.shadowRoot?.getElementById('tooltip')
    if (!tooltip) return

    // Clear any existing timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout)
      this.tooltipTimeout = null
    }

    tooltip.textContent = button.tooltip || ''

    // If tooltip is already visible (moving between buttons), show immediately
    if (this.isTooltipVisible) {
      this.showTooltip(button, tooltip)
    } else {
      // First hover - show with delay
      this.tooltipTimeout = window.setTimeout(() => {
        this.showTooltip(button, tooltip)
        this.tooltipTimeout = null
      }, 500)
    }
  }

  showTooltip(button: z.infer<typeof Button>, tooltip: HTMLElement) {
    tooltip.style.display = 'block'
    this.isTooltipVisible = true

    const buttonElement = this.shadowRoot?.querySelector(button.tag) as HTMLElement

    computePosition(buttonElement, tooltip, {
      placement: 'top',
      middleware: [offset(6), flip(), shift({ padding: 5 })],
    }).then(({ x, y }) => {
      Object.assign(tooltip.style, {
        left: `${x}px`,
        top: `${y}px`,
      })
    })
  }

  hideTooltip() {
    // Clear any pending timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout)
      this.tooltipTimeout = null
    }

    const tooltip = this.shadowRoot?.getElementById('tooltip')
    if (tooltip) {
      tooltip.style.display = 'none'
      this.isTooltipVisible = false
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-floating-menu': FloatingMenuElement
  }
}

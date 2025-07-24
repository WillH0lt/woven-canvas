import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
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

  private menuElement: HTMLElement | null = null
  private cleanupMenu: (() => void) | null = null

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: auto;
    }

    .container {
      display: flex;
      overflow: hidden;
      cursor: pointer;
      height: 100%;
      color: var(--ic-floating-menus-gray-100);
      background-color: var(--ic-floating-menus-gray-700);
      border-radius: var(--ic-floating-menus-border-radius);
    }

    .container *:first-child {
      border-top-left-radius: var(--ic-floating-menus-border-radius);
      border-bottom-left-radius: var(--ic-floating-menus-border-radius);
    }

    .container *:last-child {
      border-top-right-radius: var(--ic-floating-menus-border-radius);
      border-bottom-right-radius: var(--ic-floating-menus-border-radius);
    }

    .container * {
      width: 100%;
      height: 100%;
      transition-property: background-color;
      transition-timing-function: var(--ic-floating-menus-transition-timing-function);
      transition-duration: var(--ic-floating-menus-transition-duration);
    }

    .container *:hover:not([divider]) {
      background-color: var(--ic-floating-menus-gray-600);
    }

    #tooltip {
      display: none;
      width: max-content;
      position: absolute;
      top: 0;
      left: 0;
      background: var(--ic-floating-menus-gray-700);
      color: var(--ic-floating-menus-gray-100);
      font-weight: bold;
      padding: 5px 10px;
      border-radius: var(--ic-floating-menus-tooltip-border-radius);
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
              ?divider="${button.tag === 'ic-divider'}"
              style="width: ${button.width}px"
              @mouseenter="${() => this.onMouseEnter(button)}"
              @click="${() => this.onClick(button)}"
            />
          `,
        )}
      </div>
      <div id="tooltip" role="tooltip"></div>
    `
  }

  onClick(button: z.infer<typeof Button>) {
    if (this.cleanupMenu) {
      this.cleanupMenu()
      this.cleanupMenu = null
    }

    if (this.menuElement) {
      const tag = this.menuElement.tagName.toLowerCase()
      this.shadowRoot?.removeChild(this.menuElement)
      this.menuElement = null

      if (tag === button.menu) return
    }

    if (button.menu) {
      // If the button has a menu, create the menu element if it doesn't exist
      const menuElement = document.createElement(button.menu)
      menuElement.style.position = 'absolute'
      this.shadowRoot?.appendChild(menuElement)
      this.menuElement = menuElement

      const buttonElement = this.shadowRoot?.querySelector(button.tag)
      if (!buttonElement) return

      this.cleanupMenu = autoUpdate(buttonElement, menuElement, () => {
        computePosition(buttonElement, menuElement, {
          placement: 'top',
          middleware: [offset(6), flip(), shift({ padding: 5 })],
        }).then(({ x, y }) => {
          Object.assign(menuElement.style, {
            left: `${x}px`,
            top: `${y}px`,
          })
        })
      })
    }
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
    if (!button.tooltip) {
      tooltip.style.display = 'none'
    } else {
      tooltip.style.display = 'block'
    }

    this.isTooltipVisible = true

    const buttonElement = this.shadowRoot?.querySelector(button.tag)
    if (!buttonElement) return

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

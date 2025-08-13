import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { LitElement, type PropertyValues } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { html, unsafeStatic } from 'lit/static-html.js'

import type { Snapshot } from '../../History'
import type { Button } from '../../types'
import { style } from './floating-menu.style'

@customElement('ic-floating-menu')
export class ICFloatingMenu extends LitElement {
  static styles = style

  @property({ type: Array })
  public buttons: Button[] = []

  @property({ type: String })
  public blockId = ''

  @property({ type: Object })
  public snapshot: Snapshot = {}

  private tooltipTimeout: number | null = null
  private isTooltipVisible = false

  private menuElement: HTMLElement | null = null
  private cleanupMenu: (() => void) | null = null

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)

    this.addEventListener('pointerdown', (e) => e.stopPropagation())

    document.addEventListener('click', (e) => {
      if (!this.contains(e.target as Node)) {
        this.handleClickOutside()
      }
    })
  }

  private handleClickOutside() {
    if (this.cleanupMenu) {
      this.cleanupMenu()
      this.cleanupMenu = null
    }

    if (this.menuElement) {
      this.shadowRoot?.removeChild(this.menuElement)
      this.menuElement = null
    }

    this.hideTooltip()
  }

  render() {
    return html`
      <div class="container" @mouseleave="${() => this.hideTooltip()}">
      ${this.buttons.map(
        (button) => html`
          <${unsafeStatic(button.tag)}
            ?divider="${button.tag === 'ic-divider'}"
            style="width: ${button.width}px"
            blockId="${this.blockId}"
            .snapshot="${this.snapshot}"
            @mouseenter="${() => this.onMouseEnter(button)}"
            @click="${() => this.onClick(button)}"
          />
        `,
      )}
      </div>
      <div id="tooltip" role="tooltip"></div>
    `
  }

  onClick(button: Button) {
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
      menuElement.setAttribute('blockId', this.blockId)
      menuElement.style.position = 'absolute'
      menuElement.classList.add('menu')
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

  onMouseEnter(button: Button) {
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

  showTooltip(button: Button, tooltip: HTMLElement) {
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
    'ic-floating-menu': ICFloatingMenu
  }
}

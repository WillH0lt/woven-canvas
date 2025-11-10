import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { LitElement, type PropertyValues, nothing, isServer } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { html, unsafeStatic } from 'lit/static-html.js'
import { SignalWatcher } from '@lit-labs/preact-signals'

import { InfiniteCanvas } from '../../../InfiniteCanvas'
import type { ToolDef } from '../../../types'
import { style } from './toolbar.style'

@customElement('ic-toolbar')
export class ICToolbar extends SignalWatcher(LitElement) {
  static styles = style

  @property({ type: Array })
  public tools: ToolDef[] = []

  private tooltipTimeout: number | null = null
  private isTooltipVisible = false

  private heldTool: ToolDef | null = null

  private menuElement: HTMLElement | null = null
  private cleanupMenu: (() => void) | null = null

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)

    // const events = ['pointerdown', 'pointerup', 'pointermove', 'mousemove']
    // for (const event of events) {
    //   this.addEventListener(event, (e) => e.stopPropagation(), { passive: true })
    // }

    // // send mouseleave event to the parent when mouseenter is called
    // this.addEventListener('mouseenter', () => {
    //   const mouseLeaveEvent = new MouseEvent('mouseleave', {
    //     bubbles: true,
    //   })
    //   this.dispatchEvent(mouseLeaveEvent)
    // })
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
    const controls = InfiniteCanvas.instance!.store.core.controls

    return html`
      <div class="container" 
        @mouseleave="${() => this.onMouseLeave()}"
      >
        ${this.tools.map((tool) =>
          tool.buttonTag
            ? html`
            <${unsafeStatic(tool.buttonTag)}
              class="button"
              ?selected="${controls?.value?.leftMouseTool === tool.name}"
              @mouseenter="${() => this.onMouseEnter(tool)}"
              @mousedown="${() => this.onMouseDown(tool)}"
              @mouseup="${() => this.onMouseUp()}"
              @click="${() => this.onClick(tool)}"
            />
          `
            : nothing,
        )}
      </div>
      <div id="tooltip" role="tooltip"></div>
    `
  }

  onClick(tool: ToolDef) {
    if (this.cleanupMenu) {
      this.cleanupMenu()
      this.cleanupMenu = null
    }

    if (this.menuElement) {
      const tag = this.menuElement.tagName.toLowerCase()
      this.shadowRoot?.removeChild(this.menuElement)
      this.menuElement = null

      if (tag === tool.buttonMenuTag) return
    }

    if (tool.buttonMenuTag && tool.buttonTag) {
      // If the button has a menu, create the menu element if it doesn't exist
      const menuElement = document.createElement(tool.buttonMenuTag)
      menuElement.style.position = 'absolute'
      menuElement.classList.add('menu')
      this.shadowRoot?.appendChild(menuElement)
      this.menuElement = menuElement

      const buttonElement = this.shadowRoot?.querySelector(tool.buttonTag)
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

  onMouseEnter(tool: ToolDef) {
    const tooltip = this.shadowRoot?.getElementById('tooltip')
    if (!tooltip) return

    // Clear any existing timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout)
      this.tooltipTimeout = null
    }

    tooltip.textContent = tool.buttonTooltip || ''

    // If tooltip is already visible (moving between buttons), show immediately
    if (this.isTooltipVisible) {
      this.showTooltip(tool, tooltip)
    } else {
      // First hover - show with delay
      this.tooltipTimeout = window.setTimeout(() => {
        this.showTooltip(tool, tooltip)
        this.tooltipTimeout = null
      }, 500)
    }
  }

  onMouseDown(tool: ToolDef) {
    this.heldTool = tool
  }

  onMouseUp() {
    this.heldTool = null
  }

  onMouseLeave() {
    this.hideTooltip()

    if (this.heldTool) {
      const toolElement = this.shadowRoot?.querySelector(this.heldTool.buttonTag || '')
      toolElement?.dispatchEvent(new MouseEvent('tool-drag-out'))
    }

    this.heldTool = null
  }

  showTooltip(tool: ToolDef, tooltip: HTMLElement) {
    if (!tool.buttonTag) return

    if (!tool.buttonTooltip) {
      tooltip.style.display = 'none'
    } else {
      tooltip.style.display = 'block'
    }

    this.isTooltipVisible = true

    const buttonElement = this.shadowRoot?.querySelector(tool.buttonTag)
    if (!buttonElement) return

    computePosition(buttonElement, tooltip, {
      placement: 'top',
      middleware: [offset(16), flip(), shift({ padding: 5 })],
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
    'ic-toolbar': ICToolbar
  }
}

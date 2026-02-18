import type { InjectionKey, Ref } from 'vue'

export interface TooltipState {
  /** The text to display */
  text: string
  /** The element to anchor the tooltip to */
  anchor: HTMLElement
}

export interface TooltipContext {
  activeTooltip: Readonly<Ref<TooltipState | null>>
  isVisible: Readonly<Ref<boolean>>
  isWarmedUp: Readonly<Ref<boolean>>
  show: (text: string, anchor: HTMLElement) => void
  hide: () => void
  reset: () => void
}

export const TOOLTIP_KEY: InjectionKey<TooltipContext> = Symbol('WovenCanvasTooltip')

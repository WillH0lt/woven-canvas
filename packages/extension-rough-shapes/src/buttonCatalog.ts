import { type FloatingMenuButtonInput, floatingMenuDivider } from '@infinitecanvas/core'
import { floatingMenuButtonVerticalAlign } from '@infinitecanvas/extension-text'

export const strokeButton: FloatingMenuButtonInput = {
  tag: 'ic-rough-shape-stroke-button',
  tooltip: 'Stroke',
  menu: 'ic-rough-shape-stroke-menu',
}

export const fillButton: FloatingMenuButtonInput = {
  tag: 'ic-rough-shape-fill-button',
  tooltip: 'Fill',
  menu: 'ic-rough-shape-fill-menu',
}

export const roughShapeFloatingMenuButtons: FloatingMenuButtonInput[] = [
  strokeButton,
  fillButton,
  floatingMenuButtonVerticalAlign,
  floatingMenuDivider,
]

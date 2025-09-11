import {
  type FloatingMenuButtonInput,
  floatingMenuButtonVerticalAlign,
  floatingMenuDivider,
} from '@infinitecanvas/core'

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

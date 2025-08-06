import { type ButtonInput, floatingMenuDivider } from '@infinitecanvas/core'

export const strokeButton: ButtonInput = {
  tag: 'ic-rough-shape-stroke-button',
  tooltip: 'Stroke',
  menu: 'ic-rough-shape-stroke-menu',
}

export const fillButton: ButtonInput = {
  tag: 'ic-rough-shape-fill-button',
  tooltip: 'Fill',
  menu: 'ic-rough-shape-fill-menu',
}

export const roughShapeFloatingMenuButtons: ButtonInput[] = [strokeButton, fillButton, floatingMenuDivider]

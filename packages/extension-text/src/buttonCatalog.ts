import { type FloatingMenuButtonInput, floatingMenuDivider } from '@infinitecanvas/core'

export const textColorButton: FloatingMenuButtonInput = {
  tag: 'ic-text-color-button',
  width: 56,
  tooltip: 'Color',
  menu: 'ic-text-color-menu',
}

export const boldButton: FloatingMenuButtonInput = {
  tag: 'ic-text-bold-button',
  tooltip: 'Bold',
}

export const italicButton: FloatingMenuButtonInput = {
  tag: 'ic-text-italic-button',
  tooltip: 'Italic',
}

export const underlineButton: FloatingMenuButtonInput = {
  tag: 'ic-text-underline-button',
  tooltip: 'Underline',
}

export const alignmentButton: FloatingMenuButtonInput = {
  tag: 'ic-text-alignment-button',
  tooltip: 'Alignment',
}

export const floatingMenuButtonVerticalAlign: FloatingMenuButtonInput = {
  tag: 'ic-text-vertical-alignment-button',
  tooltip: 'Vertical Alignment',
}

export const TextEditorFloatingMenuButtons: FloatingMenuButtonInput[] = [
  textColorButton,
  floatingMenuDivider,
  boldButton,
  italicButton,
  underlineButton,
  floatingMenuDivider,
  alignmentButton,
]

import { floatingMenuDivider, type ButtonInput } from '@infinitecanvas/core'

export const textColorButton: ButtonInput = {
  tag: 'ic-text-color-button',
  width: 56,
  tooltip: 'Color',
  menu: 'ic-text-color-menu',
}

export const boldButton: ButtonInput = {
  tag: 'ic-text-bold-button',
  tooltip: 'Bold',
}

export const italicButton: ButtonInput = {
  tag: 'ic-text-italic-button',
  tooltip: 'Italic',
}

export const underlineButton: ButtonInput = {
  tag: 'ic-text-underline-button',
  tooltip: 'Underline',
}

export const alignmentButton: ButtonInput = {
  tag: 'ic-text-alignment-button',
  tooltip: 'Alignment',
}

export const floatingMenuButtonVerticalAlign: ButtonInput = {
  tag: 'ic-text-vertical-alignment-button',
  tooltip: 'Vertical Alignment',
}

export const TextEditorFloatingMenuButtons: ButtonInput[] = [
  textColorButton,
  floatingMenuDivider,
  boldButton,
  italicButton,
  underlineButton,
  floatingMenuDivider,
  alignmentButton,
]

import { floatingMenuDivider } from '@infinitecanvas/core'

const textColorButton = {
  tag: 'ic-text-color-button',
  width: 56,
  tooltip: 'Color',
  menu: 'ic-text-color-menu',
}

const boldButton = {
  tag: 'ic-text-bold-button',
  tooltip: 'Bold',
}

const italicButton = {
  tag: 'ic-text-italic-button',
  tooltip: 'Italic',
}

const underlineButton = {
  tag: 'ic-text-underline-button',
  tooltip: 'Underline',
}

const alignmentButton = {
  tag: 'ic-text-alignment-button',
  tooltip: 'Alignment',
}

export const TextEditorFloatingMenuButtons = [
  textColorButton,
  floatingMenuDivider,
  boldButton,
  italicButton,
  underlineButton,
  floatingMenuDivider,
  alignmentButton,
]

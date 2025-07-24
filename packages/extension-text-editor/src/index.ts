export { TextEditorExtension } from './TextEditorExtension.js'

const textColorButton = {
  tag: 'ic-text-color-button',
  width: 56,
  tooltip: 'Color',
  menu: 'ic-text-color-menu',
}

const boldButton = {
  tag: 'ic-bold-button',
  tooltip: 'Bold',
}

const italicButton = {
  tag: 'ic-italic-button',
  tooltip: 'Italic',
}

const underlineButton = {
  tag: 'ic-underline-button',
  tooltip: 'Underline',
}

const divider = {
  tag: 'ic-divider',
  width: 8.75,
  isDivider: true,
}

const alignmentButton = {
  tag: 'ic-alignment-button',
  tooltip: 'Alignment',
}

export const TextEditorFloatingMenuButtons = [
  textColorButton,
  divider,
  boldButton,
  italicButton,
  underlineButton,
  divider,
  alignmentButton,
]

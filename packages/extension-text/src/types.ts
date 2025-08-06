import type { BaseResources } from '@infinitecanvas/core'

export interface TextEditorResources extends BaseResources {
  textEditorContainer: HTMLDivElement
}

export enum TextAlign {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}

export enum VerticalAlign {
  Top = 'top',
  Center = 'center',
  Bottom = 'bottom',
}

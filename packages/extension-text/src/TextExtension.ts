import {
  BaseExtension,
  type BaseResources,
  type CommandArgs,
  ComponentRegistry,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
} from '@infinitecanvas/core'
import { type Signal, signal } from '@preact/signals-core'

import './elements'
import './floatingMenuButtons'
import { TextEditorFloatingMenuButtons } from './buttonCatelog'
import { Text as TextComp } from './components'
import { TextElement } from './elements'
import * as sys from './systems'
import { TextAlign } from './types'

declare module '@infinitecanvas/core' {
  interface ICommands {
    textEditor: {
      toggleBold: () => void
      toggleItalic: () => void
      toggleUnderline: () => void
      setAlignment: (alignment: TextAlign) => void
      setColor: (color: string) => void
    }
  }

  interface IStore {
    textEditor: {
      bold: Signal<boolean>
      italic: Signal<boolean>
      underline: Signal<boolean>
      alignment: Signal<TextAlign>
      color: Signal<string>
    }
  }
}

export const alignments = [TextAlign.Left, TextAlign.Center, TextAlign.Right, TextAlign.Justify]

class TextExtensionClass extends BaseExtension {
  public static blockDefs = [
    {
      tag: 'ic-text',
      canEdit: true,
      resizeMode: 'text' as const,
      editedFloatingMenu: TextEditorFloatingMenuButtons,
      components: [TextComp],
    },
  ]

  private blockContainer!: HTMLDivElement

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(TextComp)
    this.blockContainer = resources.blockContainer

    this._postUpdateGroup = this.createGroup(
      resources,
      sys.UpdateTextResize,
    )
  }

  #getEditableTextElement(): TextElement | null {
    // get ic-text element where edited is true
    // ic-text might be a direct child of the blockContainer or inside a shadowRoot
    const element = this.blockContainer.querySelector('[editing="true"]') as HTMLElement | null
    if (element instanceof TextElement) {
      return element
    }

    const textElement = element?.shadowRoot?.querySelector('ic-text') as TextElement | null
    if (textElement) {
      return textElement
    }

    console.warn('No editable text element found')
    return null
  }

  public addCommands(_send: SendCommandFn<CommandArgs>): Partial<ICommands> {
    return {
      textEditor: {
        toggleBold: () => {
          const element = this.#getEditableTextElement()
          element?.toggleBold()
        },
        toggleItalic: () => {
          const element = this.#getEditableTextElement()
          element?.toggleItalic()
        },
        toggleUnderline: () => {
          const element = this.#getEditableTextElement()
          element?.toggleUnderline()
        },
        setAlignment: (alignment: TextAlign) => {
          const element = this.#getEditableTextElement()
          element?.setAlignment(alignment)
        },
        setColor: (color: string) => {
          const element = this.#getEditableTextElement()
          element?.setColor(color)
        },
      },
    }
  }

  public addStore = (_state: State): Partial<IStore> => {
    return {
      textEditor: {
        bold: signal(false),
        italic: signal(false),
        underline: signal(false),
        alignment: signal(TextAlign.Left),
        color: signal('#000000'),
      },
    }
  }
}

export const TextExtension = () => new TextExtensionClass()

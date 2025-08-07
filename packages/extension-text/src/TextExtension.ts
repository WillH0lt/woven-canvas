import {
  type BaseComponent,
  BaseExtension,
  type BaseResources,
  type CommandArgs,
  ComponentRegistry,
  CoreCommand,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
} from '@infinitecanvas/core'
import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core'

import './elements'
import './floatingMenuButtons'
import { TextEditorFloatingMenuButtons } from './buttonCatalog'
import { Text } from './components'
import { TextElement } from './elements'
import * as sys from './systems'
import { TextAlign } from './types'

type TextData = Omit<Text, keyof BaseComponent>

declare module '@infinitecanvas/core' {
  interface ICommands {
    text: {
      toggleBold: () => void
      toggleItalic: () => void
      toggleUnderline: () => void
      setAlignment: (alignment: TextAlign) => void
      setColor: (color: string) => void
      setText: (blockId: string, text: Partial<TextData>) => void
    }
  }

  interface IStore {
    text: {
      bold: Signal<boolean>
      italic: Signal<boolean>
      underline: Signal<boolean>
      alignment: Signal<TextAlign>
      color: Signal<string>
      textById: (id: string) => ReadonlySignal<Text | undefined>
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
      components: [Text],
    },
  ]

  private blockContainer!: HTMLDivElement

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Text)
    this.blockContainer = resources.blockContainer

    this._postUpdateGroup = this.createGroup(resources, sys.UpdateTextResize)
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

  public addCommands(send: SendCommandFn<CommandArgs>): Partial<ICommands> {
    return {
      text: {
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
        setText: (blockId: string, text: Partial<TextData>) => {
          send(CoreCommand.UpdateFromSnapshot, {
            [blockId]: {
              Text: text,
            },
          })
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      text: {
        bold: signal(false),
        italic: signal(false),
        underline: signal(false),
        alignment: signal(TextAlign.Left),
        color: signal('#000000'),
        textById: (id: string): ReadonlySignal<Text | undefined> =>
          computed(() => state.getComponent<Text>(Text, id).value),
      },
    }
  }
}

export const TextExtension = () => new TextExtensionClass()

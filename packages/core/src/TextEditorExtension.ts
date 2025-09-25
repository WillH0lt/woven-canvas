import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core'
import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import { InfiniteCanvas } from './InfiniteCanvas'
import type { State } from './State'
import { textEditorFloatingMenuButtons } from './buttonCatalog'
import { CoreCommand, type CoreCommandArgs } from './commands'
import { Edited, Text } from './components'
import {} from './constants'
import {
  alignSelected,
  boldSelected,
  getSelectionAlignment,
  isSelectionBold,
  isSelectionItalic,
  isSelectionUnderlined,
  italicizeSelected,
  removeUnderlineSelected,
  unboldSelected,
  underlineSelected,
  unitalicizeSelected,
} from './textUtils'
import {
  type BaseResources,
  FloatingMenuButton,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type SerializablePropNames,
  TextAlign,
} from './types'
import { ICText } from './webComponents/blocks'

type TextData = Pick<Text, SerializablePropNames<Text>>

declare module '@infinitecanvas/core' {
  interface ICommands {
    textEditor: {
      setBold: (bold: boolean) => void
      setItalic: (italic: boolean) => void
      setUnderline: (underline: boolean) => void
      setAlignment: (alignment: TextAlign) => void
      setColor: (color: string) => void
      setText: (blockId: string, text: Partial<TextData>) => void
    }
  }

  interface IStore {
    textEditor: {
      cursorBold: Signal<boolean>
      bold: ReadonlySignal<boolean>
      cursorItalic: Signal<boolean>
      italic: ReadonlySignal<boolean>
      cursorUnderline: Signal<boolean>
      underline: ReadonlySignal<boolean>
      cursorAlignment: Signal<TextAlign>
      alignment: ReadonlySignal<TextAlign>
      color: Signal<string>
    }
  }
}

export class TextEditorExtension extends BaseExtension {
  public readonly blocks = [
    {
      tag: 'ic-text',
      editOptions: {
        canEdit: true,
        removeWhenTextEmpty: true,
      },
      resizeMode: 'text' as const,
      editedFloatingMenu: textEditorFloatingMenuButtons.map((btn) => FloatingMenuButton.parse(btn)),
      components: [Text],
    },
  ]

  public readonly floatingMenus = [
    {
      component: Text,
      buttons: textEditorFloatingMenuButtons.map((btn) => FloatingMenuButton.parse(btn)),
    },
  ]

  private readonly state: State
  private blockContainer: HTMLDivElement | null = null

  constructor(state: State) {
    super()
    this.state = state
  }

  public async preBuild(resources: BaseResources): Promise<void> {
    ComponentRegistry.instance.registerComponent(Text)

    this.blockContainer = resources.blockContainer
  }

  #getEditableTextElement(): ICText | null {
    // get ic-text element where edited is true
    // ic-text might be a direct child of the blockContainer or inside a shadowRoot
    const element = this.blockContainer?.querySelector('[is-editing="true"]') as HTMLElement | null
    if (element instanceof ICText) {
      return element
    }

    const textElement = element?.shadowRoot?.querySelector('ic-text') as ICText | null
    if (textElement) {
      return textElement
    }

    return null
  }

  #isEditingTextComputed(): ReadonlySignal<boolean> {
    return computed(() => {
      const editedIdsMap = this.state.getComponents(Edited).value
      const ids = Object.keys(editedIdsMap)
      if (ids.length > 0) {
        const textComp = this.state.getComponent(Text, ids[0]).value
        if (textComp) {
          return true
        }
      }

      return false
    })
  }

  public addCommands = (send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
    return {
      textEditor: {
        setBold: async (bold: boolean) => {
          // if there's an edited text block then set bold on that
          const element = this.#getEditableTextElement()
          if (element) {
            element.setBold(bold)
            return
          }

          if (!this.blockContainer) return

          const snapshot = bold
            ? await boldSelected(this.state, this.blockContainer)
            : await unboldSelected(this.state, this.blockContainer)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          // update the transform box in case the size of the text block changed
          send(CoreCommand.UpdateTransformBox)
        },
        setItalic: async (italic: boolean) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setItalic(italic)
            return
          }

          if (!this.blockContainer) return

          const snapshot = italic
            ? await italicizeSelected(this.state, this.blockContainer)
            : await unitalicizeSelected(this.state, this.blockContainer)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          // update the transform box in case the size of the text block changed
          send(CoreCommand.UpdateTransformBox)
        },
        setUnderline: async (underline: boolean) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setUnderline(underline)
            return
          }

          if (!this.blockContainer) return

          const snapshot = underline
            ? await underlineSelected(this.state, this.blockContainer)
            : await removeUnderlineSelected(this.state, this.blockContainer)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          // update the transform box in case the size of the text block changed
          send(CoreCommand.UpdateTransformBox)
        },
        setAlignment: async (alignment: TextAlign) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setAlignment(alignment)
            return
          }

          if (!this.blockContainer) return

          const snapshot = await alignSelected(this.state, this.blockContainer, alignment)
          send(CoreCommand.UpdateFromSnapshot, snapshot)
          // update the transform box in case the size of the text block changed
          send(CoreCommand.UpdateTransformBox)
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
      textEditor: {
        cursorBold: signal(false),
        bold: computed(() => {
          if (this.#isEditingTextComputed().value) {
            return InfiniteCanvas.instance!.store.textEditor.cursorBold.value
          }
          return isSelectionBold(state)
        }),

        cursorItalic: signal(false),
        italic: computed(() => {
          if (this.#isEditingTextComputed().value) {
            return InfiniteCanvas.instance!.store.textEditor.cursorItalic.value
          }
          return isSelectionItalic(state)
        }),

        cursorUnderline: signal(false),
        underline: computed(() => {
          if (this.#isEditingTextComputed().value) {
            return InfiniteCanvas.instance!.store.textEditor.cursorUnderline.value
          }
          return isSelectionUnderlined(state)
        }),

        cursorAlignment: signal(TextAlign.Left),
        alignment: computed(() => {
          if (this.#isEditingTextComputed().value) {
            return InfiniteCanvas.instance!.store.textEditor.cursorAlignment.value
          }

          const alignment = getSelectionAlignment(state)
          return alignment ?? TextAlign.Left
        }),

        color: signal('#000000'),
      },
    }
  }
}

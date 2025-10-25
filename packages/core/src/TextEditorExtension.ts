import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core'

import { BaseExtension } from './BaseExtension'
import { ComponentRegistry } from './ComponentRegistry'
import { FontLoader } from './FontLoader'
import type { State } from './State'
import { textEditorFloatingMenuButtons } from './buttonCatalog'
import { CoreCommand, type CoreCommandArgs } from './commands'
import { Edited, Selected, Text } from './components'
import {
  applyAlignmentToSelected,
  applyBoldToSelected,
  applyColorToSelected,
  applyFontFamilyToSelected,
  applyFontSizeToSelected,
  applyItalicToSelected,
  applyLineHeightToSelected,
  applyUnderlineToSelected,
  getSelectionAlignment,
  getSelectionColor,
  isSelectionBold,
  isSelectionItalic,
  isSelectionUnderlined,
} from './textUtils'
import {
  type BaseResources,
  type BlockDefInput,
  type ColorMenuOptions,
  type FontFamily,
  type FontMenuOptions,
  type ICommands,
  type IConfig,
  type IStore,
  type Options,
  type SendCommandFn,
  TextAlign,
} from './types'
import { ICText } from './webComponents/blocks'

declare module '@infinitecanvas/core' {
  interface ICommands {
    textEditor: {
      setBold: (bold: boolean) => void
      setItalic: (italic: boolean) => void
      setUnderline: (underline: boolean) => void
      setAlignment: (alignment: TextAlign) => void
      setColor: (color: string) => void
      setFontSize: (fontSize: number) => void
      setFontFamily: (fontFamily: FontFamily) => void
      setTextProperties: (properties: { fontFamily: FontFamily; fontSize: number; lineHeight: number }) => void
    }
  }

  interface IStore {
    textEditor: {
      selectedTexts: ReadonlySignal<Text[]>
      cursorBold: Signal<boolean>
      bold: ReadonlySignal<boolean>
      cursorItalic: Signal<boolean>
      italic: ReadonlySignal<boolean>
      cursorUnderline: Signal<boolean>
      underline: ReadonlySignal<boolean>
      cursorAlignment: Signal<TextAlign>
      alignment: ReadonlySignal<TextAlign>
      cursorColor: Signal<string>
      color: ReadonlySignal<string>
      mostRecentFontFamily: Signal<FontFamily | null>
    }
  }

  interface IConfig {
    textEditor: {
      fontMenu: FontMenuOptions
      fontColorMenu: ColorMenuOptions
    }
  }
}

export class TextEditorExtension extends BaseExtension {
  public override readonly blocks: BlockDefInput[] = [
    {
      tag: 'ic-text',
      editOptions: {
        canEdit: true,
        removeWhenTextEmpty: true,
      },
      resizeMode: 'text' as const,
      components: [Text],
    },
  ]

  public override readonly floatingMenus = [
    {
      component: Text,
      buttons: textEditorFloatingMenuButtons,
      orderIndex: 70,
    },
  ]

  private options: Options

  private blockContainer: HTMLDivElement | null = null

  private cursorBold = signal(false)
  private cursorItalic = signal(false)
  private cursorUnderline = signal(false)
  private cursorAlignment = signal(TextAlign.Left)
  private cursorColor = signal('#000000')
  private mostRecentFontFamily = signal<FontFamily | null>(null)

  constructor(options: Options) {
    super()
    this.options = options
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

  #isEditingTextComputed(state: State): ReadonlySignal<boolean> {
    return computed(() => {
      const editedIdsMap = state.getComponents(Edited).value
      const ids = Object.keys(editedIdsMap)
      if (ids.length > 0) {
        const textComp = state.getComponent(Text, ids[0]).value
        if (textComp) {
          return true
        }
      }

      return false
    })
  }

  public addConfig = (): Partial<IConfig> => {
    return {
      textEditor: {
        fontMenu: this.options.fontMenu,
        fontColorMenu: this.options.textColorMenu,
      },
    }
  }

  public addCommands = (state: State, send: SendCommandFn<CoreCommandArgs>): Partial<ICommands> => {
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

          const snapshot = await applyBoldToSelected(state, this.blockContainer, bold)

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

          const snapshot = await applyItalicToSelected(state, this.blockContainer, italic)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)
        },
        setUnderline: async (underline: boolean) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setUnderline(underline)
            return
          }

          if (!this.blockContainer) return

          const snapshot = await applyUnderlineToSelected(state, this.blockContainer, underline)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)
        },
        setAlignment: async (alignment: TextAlign) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setAlignment(alignment)
            return
          }

          if (!this.blockContainer) return

          const snapshot = await applyAlignmentToSelected(state, this.blockContainer, alignment)
          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)
        },
        setColor: async (color: string) => {
          const element = this.#getEditableTextElement()
          if (element) {
            element.setColor(color)
            return
          }

          if (!this.blockContainer) return

          const snapshot = await applyColorToSelected(state, this.blockContainer, color)
          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)
        },
        setFontSize: async (fontSize: number) => {
          if (!this.blockContainer) return

          const snapshot = await applyFontSizeToSelected(state, this.blockContainer, fontSize)
          console.log('setFontSize', fontSize, snapshot)
          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)
        },
        setFontFamily: async (fontFamily: FontFamily) => {
          if (!this.blockContainer) return

          const snapshot = await applyFontFamilyToSelected(state, this.blockContainer, fontFamily.name)

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)

          this.mostRecentFontFamily.value = fontFamily
        },
        setTextProperties: async (properties: { fontFamily: FontFamily; fontSize: number; lineHeight: number }) => {
          // all these properties affect the text block size, so we need to apply them all at once
          if (!this.blockContainer) return

          const { fontFamily, fontSize, lineHeight } = properties

          await FontLoader.loadFonts([fontFamily])

          await applyFontFamilyToSelected(state, this.blockContainer, fontFamily.name)

          const snapshot = await applyLineHeightToSelected(state, this.blockContainer, lineHeight)

          for (const id of Object.keys(snapshot)) {
            snapshot[id].Text.fontFamily = fontFamily.name
          }

          for (const id of Object.keys(snapshot)) {
            const text = state.getComponent<Text>(Text, id).value
            if (!text) continue

            const factor = fontSize / text.fontSize

            snapshot[id].Block.width = Number(snapshot[id].Block.width) * factor
            snapshot[id].Block.height = Number(snapshot[id].Block.height) * factor

            snapshot[id].Text.fontSize = fontSize
          }

          send(CoreCommand.UpdateFromSnapshot, snapshot)
          send(CoreCommand.UpdateTransformBox)

          this.mostRecentFontFamily.value = fontFamily
        },
      },
    }
  }

  public addStore = (state: State): Partial<IStore> => {
    return {
      textEditor: {
        selectedTexts: computed(() => {
          const selectedIds = state.getComponents(Selected).value
          const texts: Text[] = []
          for (const id of Object.keys(selectedIds)) {
            const text = state.getComponent<Text>(Text, id).value
            if (text) {
              texts.push(text)
            }
          }
          return texts
        }),

        cursorBold: this.cursorBold,
        bold: computed(() => {
          if (this.#isEditingTextComputed(state).value) {
            return this.cursorBold.value
          }
          return isSelectionBold(state)
        }),

        cursorItalic: this.cursorItalic,
        italic: computed(() => {
          if (this.#isEditingTextComputed(state).value) {
            return this.cursorItalic.value
          }
          return isSelectionItalic(state)
        }),

        cursorUnderline: this.cursorUnderline,
        underline: computed(() => {
          if (this.#isEditingTextComputed(state).value) {
            return this.cursorUnderline.value
          }
          return isSelectionUnderlined(state)
        }),

        cursorAlignment: this.cursorAlignment,
        alignment: computed(() => {
          if (this.#isEditingTextComputed(state).value) {
            return this.cursorAlignment.value
          }

          const alignment = getSelectionAlignment(state)
          return alignment ?? TextAlign.Left
        }),

        cursorColor: this.cursorColor,
        color: computed(() => {
          if (this.#isEditingTextComputed(state).value) {
            return this.cursorColor.value
          }
          const color = getSelectionColor(state)
          return color ?? '#000000'
        }),

        mostRecentFontFamily: this.mostRecentFontFamily,
      },
    }
  }
}

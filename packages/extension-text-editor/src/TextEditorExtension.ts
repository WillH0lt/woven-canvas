import {
  BaseExtension,
  type BaseResources,
  type CommandArgs,
  type ICommands,
  type IStore,
  type SendCommandFn,
  type State,
  TextAlign,
} from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'
import { type Signal, signal } from '@preact/signals-core'

import './elements'
import './floatingMenuButtons'
import * as sys from './systems'
import type { TextEditorResources } from './types'

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

export class TextEditorExtension extends BaseExtension {
  public name = 'text-editor'

  private viewport!: HTMLDivElement

  public async preBuild(resources: BaseResources): Promise<void> {
    const viewport = document.createElement('div')
    viewport.style.transformOrigin = '0 0'
    // establish a stacking context
    viewport.style.transform = 'translate(0, 0) scale(1)'
    viewport.style.position = 'relative'

    this.viewport = viewport

    resources.domElement.appendChild(viewport)

    const r: TextEditorResources = {
      ...resources,
      viewport,
    }

    this._preCaptureGroup = System.group(sys.PreCaptureHandleText, { resources: r })

    this._updateGroup = System.group(sys.UpdateText, { resources: r })

    this._preRenderGroup = System.group(sys.PreRenderOverlay, { resources: r })
  }

  public addCommands(_send: SendCommandFn<CommandArgs>): Partial<ICommands> {
    const viewport = this.viewport

    console.log(viewport)

    return {
      textEditor: {
        toggleBold: () => {
          const element = viewport.querySelector('ic-editable-text')
          if (!element) return
          element.toggleBold()
        },
        toggleItalic: () => {
          const element = viewport.querySelector('ic-editable-text')
          if (!element) return
          element.toggleItalic()
        },
        toggleUnderline: () => {
          const element = viewport.querySelector('ic-editable-text')
          if (!element) return
          element.toggleUnderline()
        },
        setAlignment: (alignment: TextAlign) => {
          const element = viewport.querySelector('ic-editable-text')
          if (!element) return
          element.setAlignment(alignment)
        },
        setColor: (color: string) => {
          const element = viewport.querySelector('ic-editable-text')
          if (!element) return
          element.setColor(color)
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

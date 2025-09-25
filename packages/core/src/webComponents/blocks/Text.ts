import { InfiniteCanvas } from '@infinitecanvas/core'
import type { Snapshot } from '@infinitecanvas/core'
import { ICEditableBlock } from '@infinitecanvas/core/elements'
import { Editor } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import Paragraph from '@tiptap/extension-paragraph'
import { Text as TiptapText } from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { css, html, nothing } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

import type { Text } from '../../components'
import { TextAlign as TextAlignKind } from '../../types'

const alignments = [TextAlignKind.Left, TextAlignKind.Center, TextAlignKind.Right, TextAlignKind.Justify]

@customElement('ic-text')
export class ICText extends ICEditableBlock {
  @property({ type: String }) blockId!: string

  @property({ type: Object })
  text!: Text

  @property({ type: String })
  defaultAlignment: TextAlignKind = TextAlignKind.Left

  @query('#editorContainer') editorContainer: HTMLElement | undefined

  @query('#textContainer') textContainer: HTMLElement | undefined

  private _editor: Editor | null = null

  static styles = [
    ...super.styles,
    css`
      :host {
        width: 100%;
        word-break: break-word;
      }

      p {
        margin: 0;
      }

      p:empty::before {
        content: '';
        display: inline-block;
      }

      .ProseMirror-focused {
        outline: none;
      }
    `,
  ]

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties)

    if (changedProperties.has('isEditing')) {
      if (this.isEditing) {
        this.startEditing()
      } else {
        this.endEditing()
      }
    }
  }

  public connectedCallback(): void {
    super.connectedCallback()

    this.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') return
      event.stopPropagation()
    })
  }

  private handlePointerEnter(event: PointerEvent): void {
    const position = this._editor?.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    })

    // set caret position to pointer
    this._editor
      ?.chain()
      .focus()
      .setTextSelection(position?.pos ?? 0)
      .run()
  }

  private async startEditing(): Promise<void> {
    const _handlePointer = this.handlePointerEnter.bind(this)
    this.addEventListener('pointerenter', _handlePointer, { once: true })

    // remove listener after a short delay so prevent cursor from jumping
    setTimeout(() => {
      this.removeEventListener('pointerenter', _handlePointer)
    }, 50)

    await this.updateComplete

    this._editor = new Editor({
      element: this.editorContainer,
      extensions: [
        Document,
        Paragraph,
        TiptapText,
        TextStyleKit,
        Bold,
        Italic,
        Underline,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
          defaultAlignment: this.defaultAlignment,
        }),
        History,
      ],
      content: this.text.content,
      parseOptions: {
        preserveWhitespace: true,
      },
    })

    this._editor.on('selectionUpdate', () => {
      this.syncStore()
    })

    // this._editor.on('update', () => {
    //   this.centerMenuToFitContent()
    // })

    this.syncStore()

    this._editor?.chain().focus().setTextSelection(0).run()

    // stop propagation because text can overflow block when resize mode is 'free'
    const pointerEvents = ['pointerdown', 'pointerup', 'pointermove', 'pointercancel']
    for (const pointerEvent of pointerEvents) {
      this.editorContainer?.addEventListener(pointerEvent, (ev) => ev.stopPropagation())
    }
  }

  private endEditing(): void {
    if (this._editor) {
      this._editor.destroy()
      this._editor = null
    }
  }

  public getSnapshot(): Snapshot {
    const element = this.editorContainer || this.textContainer
    if (!element) {
      return {}
    }

    return {
      [this.blockId]: {
        Block: this.computeBlockDimensions(element),
        Text: {
          content: this._editor?.getHTML() ?? this.text.content,
        },
      },
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback()

    if (this._editor !== null) {
      this._editor.destroy()
      this._editor = null
    }
  }

  public setColor(color: string): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    if (from === to) {
      this._editor.chain().focus().selectAll().setColor(color).setTextSelection(to).run()
    } else {
      this._editor.chain().focus().setColor(color).run()
    }

    this.syncStore()
  }

  public setBold(bold: boolean): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    let cmd = this._editor.chain().focus()

    const updateAllText = from === to

    if (updateAllText) {
      cmd = cmd.selectAll()
    }

    if (bold) {
      cmd = cmd.setBold()
    } else {
      cmd = cmd.unsetBold()
    }

    if (updateAllText) {
      cmd = cmd.setTextSelection(to)
    }

    cmd.run()

    this.syncStore()
  }

  public setItalic(italic: boolean): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    let cmd = this._editor.chain().focus()

    const updateAllText = from === to

    if (updateAllText) {
      cmd = cmd.selectAll()
    }

    if (italic) {
      cmd = cmd.setItalic()
    } else {
      cmd = cmd.unsetItalic()
    }

    if (updateAllText) {
      cmd = cmd.setTextSelection(to)
    }

    cmd.run()

    this.syncStore()
  }

  public setUnderline(underline: boolean): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    let cmd = this._editor.chain().focus()

    const updateAllText = from === to

    if (updateAllText) {
      cmd = cmd.selectAll()
    }

    if (underline) {
      cmd = cmd.setUnderline()
    } else {
      cmd = cmd.unsetUnderline()
    }

    if (updateAllText) {
      cmd = cmd.setTextSelection(to)
    }

    cmd.run()

    this.syncStore()
  }

  public setAlignment(alignment: TextAlignKind): void {
    this._editor?.chain().selectAll().setTextAlign(alignment).run()
    this.syncStore()
  }

  render() {
    const text = this.text
    if (!text) {
      return nothing
    }

    const styles: Record<string, string> = {
      'font-family': text.fontFamily,
      'line-height': `${text.lineHeight}`,
      'font-size': `${text.fontSize}px`,
      'pointer-events': this.isEditing ? 'auto' : 'none',
      'text-align': this.defaultAlignment.toLowerCase(),
      'white-space': this.text.constrainWidth ? 'pre-wrap' : 'pre',
      display: 'block',
      'min-width': '2px',
      width: this.text.constrainWidth ? '100%' : 'fit-content',
    }

    return html`${
      this.isEditing
        ? html`<div id="editorContainer" style=${styleMap(styles)}></div>`
        : html`<div id="textContainer" style=${styleMap(styles)}>${unsafeHTML(text.content)}</div>`
    }`
  }

  private syncStore(): void {
    const editor = this._editor
    if (!editor) return

    const store = InfiniteCanvas.instance?.store.textEditor
    if (!store) return

    store.cursorColor.value = editor.getAttributes('textStyle').color ?? '#000000'

    store.cursorBold.value = editor.isActive('bold')
    store.cursorItalic.value = editor.isActive('italic')
    store.cursorUnderline.value = editor.isActive('underline')

    const currentAlignment = alignments.find((alignment) => editor.isActive({ textAlign: alignment }))
    store.cursorAlignment.value = currentAlignment ?? TextAlignKind.Left
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text': ICText
  }
}

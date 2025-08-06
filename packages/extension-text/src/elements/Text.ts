import { InfiniteCanvas } from '@infinitecanvas/core'
import type { Snapshot } from '@infinitecanvas/core'
import { BaseEditable } from '@infinitecanvas/core/elements'
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

import { alignments } from '../TextExtension'
import type { Text } from '../components'
import { TextAlign as TextAlignKind } from '../types'

@customElement('ic-text')
export class TextElement extends BaseEditable {
  @property({ type: String }) blockId!: string

  @property({ type: Object })
  text!: Text

  @property({ type: Boolean })
  editing = false

  @query('#editorContainer') editorContainer: HTMLElement | undefined

  private _editor: Editor | null = null

  static styles = css`
    :host {
      white-space: pre-wrap;
      word-break: break-word;
      width: 100%;
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
  `

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties)

    if (changedProperties.has('editing')) {
      if (this.editing) {
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
    this.addEventListener('pointerenter', this.handlePointerEnter.bind(this), { once: true })

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
          defaultAlignment: 'left',
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
    if (!this.editing) return {}

    return {
      [this.blockId]: {
        Block: {
          width: this.editorContainer?.clientWidth ?? 0,
          height: this.editorContainer?.clientHeight ?? 0,
        },
        Text: {
          content: this._editor?.getHTML() ?? '',
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

  public toggleBold(): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    if (from === to) {
      this._editor.chain().focus().selectAll().toggleBold().setTextSelection(to).run()
    } else {
      this._editor.chain().focus().toggleBold().run()
    }

    this.syncStore()
  }

  public toggleItalic(): void {
    if (!this._editor) return

    const { from, to } = this._editor.state.selection

    if (from === to) {
      this._editor.chain().focus().selectAll().toggleItalic().setTextSelection(to).run()
    } else {
      this._editor.chain().focus().toggleItalic().run()
    }

    this.syncStore()
  }

  public toggleUnderline(): void {
    if (!this._editor) return
    const { from, to } = this._editor.state.selection

    if (from === to) {
      this._editor.chain().focus().selectAll().toggleUnderline().setTextSelection(to).run()
    } else {
      this._editor.chain().focus().toggleUnderline().run()
    }

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

    const styles = {
      'font-family': text.fontFamily,
      'line-height': `${text.lineHeight}`,
      'font-size': `${text.fontSize}px`,
      'pointer-events': this.editing ? 'auto' : 'none',
    }

    return html`${
      this.editing
        ? html`<div id="editorContainer" style=${styleMap(styles)}></div>`
        : html`<div style=${styleMap(styles)}>${unsafeHTML(text.content)}</div>`
    }`
  }

  private syncStore(): void {
    const editor = this._editor
    if (!editor) return

    const store = InfiniteCanvas.instance?.store.text
    if (!store) return

    store.color.value = editor.getAttributes('textStyle').color ?? '#000000'

    store.bold.value = editor.isActive('bold')
    store.italic.value = editor.isActive('italic')
    store.underline.value = editor.isActive('underline')

    const currentAlignment = alignments.find((alignment) => editor.isActive({ textAlign: alignment }))
    store.alignment.value = currentAlignment ?? TextAlignKind.Left
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-text': TextElement
  }
}

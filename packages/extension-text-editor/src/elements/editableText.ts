import { InfiniteCanvas, TextAlign as TextAlignKind, type TextModel } from '@infinitecanvas/core'
import { type ReadonlySignal, SignalWatcher } from '@lit-labs/preact-signals'
import { Editor } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { LitElement, type PropertyValues, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import { alignments } from '../TextEditorExtension'

@customElement('ic-editable-text')
export class EditableTextElement extends SignalWatcher(LitElement) {
  @property({ type: String }) blockId!: string

  private model!: ReadonlySignal<TextModel>

  @property({ type: Number }) pointerStartX?: number
  @property({ type: Number }) pointerStartY?: number

  private _editor: Editor | null = null

  static styles = css`
    :host {
      white-space: pre-wrap;
      word-break: break-word;
    }
    p {
      margin: 0;
    }
    .ProseMirror-focused {
      outline: none;
    }
  `

  public connectedCallback(): void {
    super.connectedCallback()

    this.model = InfiniteCanvas.instance?.store.core.textById(this.blockId) as ReadonlySignal<TextModel>
  }

  public firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)

    this.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') return
      event.stopPropagation()
    })

    const element = this.renderRoot.querySelector('#editor-content')

    if (!element) {
      console.error('Editor content element not found')
      return
    }

    this._editor = new Editor({
      element,
      extensions: [
        Document,
        Paragraph,
        Text,
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
      content: this.model.value.content,
      parseOptions: {
        preserveWhitespace: true,
      },
    })

    this._editor.on('selectionUpdate', () => {
      this.syncStore()
    })

    if (this.pointerStartX !== undefined && this.pointerStartY !== undefined) {
      const position = this._editor.view.posAtCoords({
        left: this.pointerStartX,
        top: this.pointerStartY,
      })

      this._editor
        .chain()
        .focus()
        .setTextSelection(position?.pos ?? 0)
        .run()
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback()

    if (this._editor !== null) {
      this._editor.destroy()
      this._editor = null
    }
  }

  public getEditorContent(): string | null {
    return this._editor?.getHTML() ?? null
  }

  public getEditorSize(): { width: number; height: number } | null {
    const element = this.renderRoot.querySelector('#editor-content')
    if (!element) return null

    return {
      width: element.clientWidth,
      height: element.clientHeight,
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
    return html`<div id="editor-content" style=${styleMap({
      'font-family': this.model.value.fontFamily,
      'line-height': `${this.model.value.lineHeight}`,
      'font-size': `${this.model.value.fontSize}px`,
    })}></div>`
  }

  syncStore(): void {
    const editor = this._editor
    if (!editor) return

    const store = InfiniteCanvas.instance?.store.textEditor
    if (!store) return

    store.color.value = editor.getAttributes('textStyle').color ?? '#000000'

    store.bold.value = editor.isActive('bold')
    store.italic.value = editor.isActive('italic')
    store.underline.value = editor.isActive('underline')

    const currentAlignment = alignments.find((alignment) => editor.isActive({ textAlign: alignment }))
    store.alignment.value = currentAlignment ?? TextAlignKind.Left

    // if (editor.isActive('link')) {
    //   link.value = editor.getAttributes('link')?.href ?? '';
    // } else {
    //   link.value = '';
    // }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-editable-text': EditableTextElement
  }
}

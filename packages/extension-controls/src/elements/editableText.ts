import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { LitElement, type PropertyValues, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import type { TextModel } from '@infinitecanvas/core'

@customElement('ic-editable-text')
export class EditableTextElement extends LitElement {
  @property({ type: Object }) model!: TextModel
  @property({ type: Number }) fontSize!: number

  @property({ type: Number }) pointerStartX?: number
  @property({ type: Number }) pointerStartY?: number

  private _editor: Editor | null = null

  static styles = css`
    p {
      margin: 0;
    }
    .ProseMirror-focused {
      outline: none;
    }
  `

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
      extensions: [Document, Paragraph, Text, History],
      content: this.model?.content,
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

  render() {
    return html`
    <div id="editor-content" style=${styleMap({
      'font-family': this.model.fontFamily,
      'text-align': this.model.align,
      'line-height': `${this.model.lineHeight}`,
      color: `rgba(${this.model.red}, ${this.model.green}, ${this.model.blue}, ${this.model.alpha / 255})`,
      'font-size': `${this.fontSize}px`,
    })}></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ic-editable-text': EditableTextElement
  }
}

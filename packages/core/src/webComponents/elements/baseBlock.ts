import { LitElement, css } from 'lit'
import { property } from 'lit/decorators.js'

export class ICBaseBlock extends LitElement {
  static styles = [
    css`
    :host([is-hovered]),
    :host([is-selected]) {
      outline: var(--ic-highlighted-block-outline-width) solid
        var(--ic-highlighted-block-outline-color);
      outline-offset: var(--ic-highlighted-block-outline-offset);
      border-radius: var(--ic-highlighted-block-border-radius);
    }
  `,
  ]

  @property()
  public blockId!: string

  @property({ type: Boolean, reflect: true, attribute: 'is-hovered' })
  public isHovered = false

  @property({ type: Boolean, reflect: true, attribute: 'is-selected' })
  public isSelected = false
}

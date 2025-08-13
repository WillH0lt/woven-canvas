import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'

export class ICBaseBlock extends LitElement {
  @property()
  public blockId!: string

  @property({ type: Boolean })
  public isHovered = false

  @property({ type: Boolean })
  public isSelected = false
}

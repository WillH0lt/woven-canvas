import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'

export class ICBaseMenuButton extends LitElement {
  @property()
  public blockId!: string
}

import { LitElement } from 'lit'
import { property } from 'lit/decorators.js'

export class BaseElement extends LitElement {
  @property()
  public blockId!: string
}

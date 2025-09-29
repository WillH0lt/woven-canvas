import { BaseComponent } from '@infinitecanvas/core'
import { Type, component, field } from '@lastolivegames/becsy'

@component
export class Text extends BaseComponent {
  @field.dynamicString(1e4) public declare content: string
  @field({ type: Type.float64, default: 24 }) public declare fontSize: number
  @field({ type: Type.dynamicString(36), default: 'Figtree' }) public declare fontFamily: string
  @field({ type: Type.float64, default: 1.2 }) public declare lineHeight: number
  @field.boolean public declare constrainWidth: boolean

  public hasContent(): boolean {
    // check if content has any text characters, ie <strong> </strong> is not considered text
    // remove everything between <> and trim whitespace
    const text = this.content.replace(/<[^>]*>/g, '').trim()
    return text.length > 0
  }
}

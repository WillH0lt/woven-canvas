import { component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Cursor extends BaseComponent {
  @field.dynamicString(2048) public declare svg: string

  @field.dynamicString(2048) public declare contextSvg: string

  // @field.boolean public declare useContext: boolean
}

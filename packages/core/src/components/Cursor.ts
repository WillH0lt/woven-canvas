import { component, field } from '@lastolivegames/becsy'
import { BaseComponent } from '../BaseComponent'

@component
export class Cursor extends BaseComponent {
  @field.dynamicString(2048) public declare svg: string

  // heldBlock is a stringified block that the cursor is currently placing
  @field.dynamicString(512) public declare heldBlock: string
}

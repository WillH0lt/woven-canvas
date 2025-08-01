import { type Entity, component, field } from '@lastolivegames/becsy'

import { CommandRef } from './CommandRef'

@component
export class Command {
  @field.dynamicString(32) public declare kind: string
  @field.dynamicString(1e4) public declare payload: string
  @field.backrefs(CommandRef, 'command', true) public declare refs: Entity[]
}

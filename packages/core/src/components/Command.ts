import { type Entity, component, field } from '@lastolivegames/becsy'

import { CommandRef } from './CommandRef.js'

@component
export class Command {
  @field.dynamicString(32) public declare kind: string
  @field.dynamicString(512) public declare payload: string
  @field.backrefs(CommandRef) public declare refs: Entity[]
}

import { component, field } from '@lastolivegames/becsy'

@component
export class Pointer {
  @field.int32.vector(2) public declare position: [number, number]
  @field.int32.vector(2) public declare downPosition: [number, number]
  @field.boolean public declare isDown: boolean
  @field.boolean public declare downTrigger: boolean
  @field.boolean public declare upTrigger: boolean
  @field.boolean public declare moveTrigger: boolean
}

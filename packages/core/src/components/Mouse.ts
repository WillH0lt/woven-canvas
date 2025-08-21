import { component, field } from '@lastolivegames/becsy'

@component
export class Mouse {
  @field.int32.vector(2) public declare position: [number, number]
  @field.boolean public declare moveTrigger: boolean
  @field.boolean public declare leaveTrigger: boolean
  @field.boolean public declare enterTrigger: boolean

  @field.boolean public declare wheelTrigger: boolean
  @field.float32 public declare wheelDelta: number
}

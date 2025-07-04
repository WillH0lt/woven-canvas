import { component, field } from '@lastolivegames/becsy'

import type { CommandModel, ISerializable } from '../types'

@component
export class Command implements ISerializable {
  @field.dynamicString(32) public declare kind: string
  @field.dynamicString(512) public declare payload: string
  @field.dynamicString(36) public declare uid: string
  @field.dynamicString(36) public declare seed: string
  @field.uint32 public declare frame: number

  public toModel(): CommandModel {
    return {
      kind: this.kind,
      payload: this.payload,
      uid: this.uid,
      seed: this.seed,
      frame: this.frame,
    }
  }

  public fromModel(model: CommandModel): void {
    this.kind = model.kind
    this.payload = model.payload
    this.uid = model.uid
    this.seed = model.seed
    this.frame = model.frame
  }
}

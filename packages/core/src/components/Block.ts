import { Type, component, field } from '@lastolivegames/becsy'
import type { BlockModel, ISerializable } from '../types'

@component
export class Block implements ISerializable<BlockModel> {
  @field.dynamicString(36) public declare id: string
  @field.float32 declare top: number
  @field.float32 declare left: number
  @field.float32 declare width: number
  @field.float32 declare height: number
  @field.float32 declare rotateZ: number
  @field.dynamicString(36) public declare createdBy: string
  @field({ type: Type.dynamicString(36), default: 'ic-shape' }) public declare tag: string
  @field.dynamicString(36) public declare rank: string

  @field.boolean public declare stretchableWidth: boolean
  @field.boolean public declare stretchableHeight: boolean
  @field.boolean public declare hasStretched: boolean

  toModel(): BlockModel {
    return {
      id: this.id,
      top: this.top,
      left: this.left,
      width: this.width,
      height: this.height,
      rotateZ: this.rotateZ,
      createdBy: this.createdBy,
      tag: this.tag,
      rank: this.rank,
      stretchableWidth: this.stretchableWidth,
      stretchableHeight: this.stretchableHeight,
      hasStretched: this.hasStretched,
    }
  }

  fromModel(model: BlockModel): void {
    this.id = model.id
    this.top = model.top
    this.left = model.left
    this.width = model.width
    this.height = model.height
    this.rotateZ = model.rotateZ
    this.createdBy = model.createdBy
    this.tag = model.tag
    this.rank = model.rank
    this.stretchableWidth = model.stretchableWidth
    this.stretchableHeight = model.stretchableHeight
    this.hasStretched = model.hasStretched
  }
}

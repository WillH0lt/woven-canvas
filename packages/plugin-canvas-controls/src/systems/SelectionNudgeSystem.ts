import {
  Block,
  defineEditorSystem,
  defineQuery,
  filterRoots,
  on,
  Selected,
  TransformBoxStateSingleton,
  UpdateTransformBox,
} from '@woven-canvas/core'
import { Vec2 } from '@woven-canvas/math'
import { NudgeSelected } from '../commands'

const selectedBlocks = defineQuery((q) => q.with(Block, Selected))

export const SelectionNudgeSystem = defineEditorSystem({ phase: 'update' }, (ctx) => {
  on(ctx, NudgeSelected, (ctx, { offset }) => {
    for (const entityId of filterRoots(ctx, [...selectedBlocks.current(ctx)])) {
      const position = Block.getWorldPosition(ctx, entityId)
      Vec2.add(position, offset)
      Block.setWorldPosition(ctx, entityId, position)
    }
    const { transformBoxId } = TransformBoxStateSingleton.read(ctx)
    if (transformBoxId !== null) UpdateTransformBox.spawn(ctx, { transformBoxId })
  })
})

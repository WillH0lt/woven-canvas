import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import { LexoRank } from 'lexorank'
import { UpdateSelection } from './UpdateSelection'
import { UpdateTransformBox } from './UpdateTransformBox'

// function getRankBounds(parts: readonly Entity[]): [LexoRank, LexoRank] {
//   let minRank = LexoRank.max();
//   let maxRank = LexoRank.min();

//   for (const part of parts) {
//     const rank = LexoRank.parse(part.read(comps.Block).rank);
//     minRank = rank.compareTo(minRank) < 0 ? rank : minRank;
//     maxRank = rank.compareTo(maxRank) > 0 ? rank : maxRank;
//   }

//   return [minRank, maxRank];
// }

export class UpdateRanks extends System {
  private readonly blocks = this.query(
    (q) => q.added.current.changed.with(comps.Block).trackWrites.using(comps.ZIndex).write,
  )
  // private readonly zIndices = this.query((q) => q.current.with(comps.ZIndex).write)

  public constructor() {
    super()
    this.schedule((s) => s.after(UpdateSelection, UpdateTransformBox))
  }

  public execute(): void {
    let needsReordering = false
    for (const blockEntity of this.blocks.added) {
      const block = blockEntity.read(comps.Block)

      if (block.rank === '') {
        console.error('Block rank is empty')
      }

      blockEntity.add(comps.ZIndex, {
        rank: block.rank,
      })

      needsReordering = true
    }

    for (const blockEntity of this.blocks.changed) {
      const block = blockEntity.read(comps.Block)
      const zIndex = blockEntity.read(comps.ZIndex)
      if (zIndex.rank !== block.rank) {
        blockEntity.write(comps.ZIndex).rank = block.rank
        needsReordering = true
      }
    }
    if (needsReordering) {
      this.orderZIndices()
    }
  }

  private orderZIndices(): void {
    const rankMap = new Map<string, LexoRank>()
    const zIndexMap = new Map<string, number>()

    for (const blockEntity of this.blocks.current) {
      const zIndex = blockEntity.read(comps.ZIndex)
      zIndexMap.set(zIndex.rank, zIndex.value)
      rankMap.set(zIndex.rank, LexoRank.parse(zIndex.rank))
    }

    const sortedRanks = Array.from(rankMap.values()).sort((a, b) => a.compareTo(b))

    let currentZIndex = 0
    for (const rank of sortedRanks) {
      zIndexMap.set(rank.toString(), currentZIndex++)
    }

    for (const blockEntity of this.blocks.current) {
      const zIndex = blockEntity.write(comps.ZIndex)
      zIndex.value = zIndexMap.get(zIndex.rank) ?? 0
    }
  }
}

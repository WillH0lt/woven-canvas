import { comps } from '@infinitecanvas/core'
import { System } from '@lastolivegames/becsy'

import { LexoRank } from 'lexorank'
import { UpdateSelection } from './UpdateSelection'
import { UpdateTransformBox } from './UpdateTransformBox'

export class UpdateRanks extends System {
  private readonly blocks = this.query(
    (q) => q.added.current.changed.with(comps.Block).trackWrites.using(comps.ZIndex).write,
  )

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
    // creating a seperate ranks map so we only have to call LexoRank.parse once per rank
    const rankMap = new Map<string, LexoRank>()

    for (const blockEntity of this.blocks.current) {
      const zIndex = blockEntity.read(comps.ZIndex)
      rankMap.set(zIndex.rank, LexoRank.parse(zIndex.rank))
    }

    const sortedRanks = Array.from(rankMap.values()).sort((a, b) => a.compareTo(b))

    // map of rank string to zIndex value
    // saves us from looking up the rank in the sorted array for each block
    const zIndexMap = new Map<string, number>()

    sortedRanks.forEach((rank, i) => {
      zIndexMap.set(rank.toString(), i)
    })

    for (const blockEntity of this.blocks.current) {
      // TODO investigate performance of calling blockEntity.write for every block
      const zIndex = blockEntity.write(comps.ZIndex)
      zIndex.value = zIndexMap.get(zIndex.rank) ?? 0
    }
  }
}

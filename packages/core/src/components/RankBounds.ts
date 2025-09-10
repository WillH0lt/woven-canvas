import { Type, component, field } from '@lastolivegames/becsy'

import { LexoRank } from '@dalet-oss/lexorank'

@component
export class RankBounds {
  @field({ type: Type.dynamicString(36), default: LexoRank.max().toString() }) public declare minRank: string
  @field({ type: Type.dynamicString(36), default: LexoRank.min().toString() }) public declare maxRank: string

  public genNext(): LexoRank {
    if (LexoRank.parse(this.minRank).compareTo(LexoRank.max()) === 0) {
      return LexoRank.middle()
    }

    const next = LexoRank.parse(this.maxRank).genNext()
    this.maxRank = next.toString()

    return next
  }

  public genPrev(): LexoRank {
    if (LexoRank.parse(this.maxRank).compareTo(LexoRank.min()) === 0) {
      return LexoRank.middle()
    }

    const prev = LexoRank.parse(this.minRank).genPrev()
    this.minRank = prev.toString()

    return prev
  }

  public add(rank: LexoRank): void {
    if (rank.compareTo(LexoRank.parse(this.minRank)) < 0) {
      this.minRank = rank.toString()
    }

    if (rank.compareTo(LexoRank.parse(this.maxRank)) > 0) {
      this.maxRank = rank.toString()
    }
  }
}

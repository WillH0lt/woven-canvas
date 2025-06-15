import { Type, component, field } from '@lastolivegames/becsy'

import { LexoRank } from 'lexorank'

@component
export class RankBounds {
  @field({ type: Type.dynamicString(36), default: LexoRank.middle().toString() }) public declare minRank: string
  @field({ type: Type.dynamicString(36), default: LexoRank.middle().toString() }) public declare maxRank: string

  public genNext(): LexoRank {
    const next = LexoRank.parse(this.maxRank).genNext()
    this.maxRank = next.toString()

    return next
  }
}

import { LexoRank } from 'lexorank'

const maxRank = LexoRank.max().toString()

export const SELECTION_BOX_RANK = maxRank
export const TRANSFORM_HANDLE_CORNER_RANK = maxRank
export const TRANSFORM_BOX_RANK = LexoRank.parse(maxRank).genPrev().toString()
export const TRANSFORM_HANDLE_ROTATE_RANK = LexoRank.parse(TRANSFORM_HANDLE_CORNER_RANK).genPrev().toString()
export const TRANSFORM_HANDLE_EDGE_RANK = LexoRank.parse(TRANSFORM_HANDLE_ROTATE_RANK).genPrev().toString()

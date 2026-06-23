import { STRATUM_ORDER } from '../constants'
import type { Stratum } from '../types'

/**
 * Minimal block info needed for hierarchical sort.
 */
export interface SortableBlock {
  rank: string
  stratum: Stratum
  parentId: unknown // EntityId or null — we only need identity comparison
  layerRank?: string
}

/**
 * Build the rank chain from root ancestor down to this block.
 * Models CSS stacking contexts: a child's z-order is scoped by its parent.
 *
 * @param getBlock - Lookup function to get a block by its parentId
 * @param block - The block to build the chain for
 * @returns Array of ranks from root ancestor to self, e.g. [grandparentRank, parentRank, selfRank]
 */
function getRankChain(getBlock: (id: unknown) => SortableBlock | null, block: SortableBlock): string[] {
  const chain: string[] = [block.rank]
  let current = block.parentId
  const visited = new Set<unknown>()

  while (current !== null) {
    if (visited.has(current)) break
    visited.add(current)
    const parent = getBlock(current)
    if (!parent) break
    chain.push(parent.rank)
    current = parent.parentId
  }

  chain.reverse()
  return chain
}

/**
 * Compare two rank chains lexicographically (descending — higher rank first).
 * At each depth level, compare ranks. If one chain is a prefix of the other,
 * the longer chain (child) sorts after the shorter (parent) — child renders on top.
 */
function compareRankChains(a: string[], b: string[]): number {
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] > b[i]) return 1
    if (a[i] < b[i]) return -1
  }
  // Longer chain (child) sorts after shorter (parent) — child is on top
  return a.length - b.length
}

/**
 * Compare two blocks for sort order (ascending — lower/behind first).
 * Respects stratum ordering and parent-child stacking contexts.
 *
 * @param getBlock - Lookup function to resolve parentId to a SortableBlock
 * @param a - First block
 * @param b - Second block
 * @returns Negative if a is behind b, positive if a is in front of b, 0 if equal
 */
export function compareBlockOrder(
  getBlock: (id: unknown) => SortableBlock | null,
  a: SortableBlock,
  b: SortableBlock,
): number {
  const stratumDiff = STRATUM_ORDER[a.stratum] - STRATUM_ORDER[b.stratum]
  if (stratumDiff !== 0) return stratumDiff

  // Within a stratum, layer rank dominates: a block in a higher-ranked layer
  // sorts in front of one in a lower-ranked layer, regardless of rank chain.
  // Unlayered blocks ('') share a band and fall through to the rank chain,
  // so behavior is unchanged until layers are actually used.
  const aLayer = a.layerRank ?? ''
  const bLayer = b.layerRank ?? ''
  if (aLayer !== bLayer) return aLayer < bLayer ? -1 : 1

  // Within the same layer, sort by hierarchical rank chain
  const chainA = getRankChain(getBlock, a)
  const chainB = getRankChain(getBlock, b)
  return compareRankChains(chainA, chainB)
}

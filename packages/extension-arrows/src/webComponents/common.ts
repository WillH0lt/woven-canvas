import { type SVGTemplateResult, svg } from 'lit'
import type { ArrowHeadKind } from '../types'

export const ARROW_HEAD_GAP = 15

export function getArrowHeadPath(
  position: [number, number],
  direction: [number, number],
  arrowHeadKind: ArrowHeadKind,
  thickness: number,
  color: string,
): SVGTemplateResult {
  const dirLen = Math.hypot(direction[0], direction[1])
  if (dirLen === 0) {
    return svg``
  }
  const unitDir: [number, number] = [direction[0] / dirLen, direction[1] / dirLen]
  const perpDir: [number, number] = [-unitDir[1], unitDir[0]]

  const length = 15
  const width = 20

  const p1: [number, number] = [
    position[0] - unitDir[0] * length + perpDir[0] * (width / 2),
    position[1] - unitDir[1] * length + perpDir[1] * (width / 2),
  ]
  const p2: [number, number] = [
    position[0] - unitDir[0] * length - perpDir[0] * (width / 2),
    position[1] - unitDir[1] * length - perpDir[1] * (width / 2),
  ]

  return svg`
      <line
        x1="${p1[0]}"
        y1="${p1[1]}"
        x2="${position[0]}"
        y2="${position[1]}"
        stroke="${color}"
        stroke-width="${thickness}"
        stroke-linecap="round"
      />
      <line
        x1="${p2[0]}"
        y1="${p2[1]}"
        x2="${position[0]}"
        y2="${position[1]}"
        stroke="${color}"
        stroke-width="${thickness}"
        stroke-linecap="round"
      />
  `
}

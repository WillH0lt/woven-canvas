import { ArrowHeadKind } from '@infinitecanvas/plugin-arrows'

export interface ArrowHeadDef {
  kind: ArrowHeadKind
  label: string
  gap: number
  svg: string
}

/**
 * Arrow head definitions catalog.
 * SVGs are designed to point rightward (positive X direction) at origin.
 * The gap value indicates how much to offset the arrow line from the endpoint.
 */
export const ARROW_HEADS: ArrowHeadDef[] = [
  {
    kind: ArrowHeadKind.None,
    label: 'None',
    gap: 0,
    svg: ``,
  },
  {
    kind: ArrowHeadKind.V,
    label: 'Arrow',
    gap: 15,
    svg: `<polyline points="-10,-7 -1,0 -10,7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`,
  },
  {
    kind: ArrowHeadKind.Delta,
    label: 'Triangle',
    gap: 20,
    svg: `<polygon points="-1,0 -12,-7 -12,7" fill="currentColor" />`,
  },
  {
    kind: ArrowHeadKind.Circle,
    label: 'Circle',
    gap: 0,
    svg: `<circle cx="-6" cy="0" r="6" fill="currentColor" />`,
  },
  {
    kind: ArrowHeadKind.Diamond,
    label: 'Diamond',
    gap: 0,
    svg: `<polygon points="0,0 -7,-6 -14,0 -7,6" fill="currentColor" />`,
  },
]

/**
 * Get arrow head definition by kind.
 */
export function getArrowHead(kind: ArrowHeadKind): ArrowHeadDef | undefined {
  return ARROW_HEADS.find((h) => h.kind === kind)
}

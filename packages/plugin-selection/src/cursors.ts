import type { CursorDef } from '@woven-canvas/core'

/**
 * Cursor kinds for transform operations.
 */
export enum CursorKind {
  Drag = 'drag',
  NESW = 'nesw',
  NWSE = 'nwse',
  NS = 'ns',
  EW = 'ew',
  RotateNW = 'rotateNW',
  RotateNE = 'rotateNE',
  RotateSW = 'rotateSW',
  RotateSE = 'rotateSE',
}

// SVG Templates

const DRAG_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33.94 33.94">
  <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path d="M25.46,14.14l2.83,2.83-2.83,2.83"/>
    <path d="M19.8,16.97h8.49"/>
    <path d="M8.49,19.8l-2.83-2.83,2.83-2.83"/>
    <path d="M5.66,16.97h14.57"/>
    <path d="M14.14,25.46l2.83,2.83,2.83-2.83"/>
    <path d="M16.97,19.8v8.49"/>
    <path d="M19.8,8.49l-2.83-2.83-2.83,2.83"/>
    <path d="M16.97,5.66v15.14"/>
  </g>
</svg>`

function makeResizeSvg(rotateZ: number): string {
  const degrees = (rotateZ * 180) / Math.PI
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="rotate(${degrees} 12 12)">
    <path d="M8 7l4 -4l4 4"/>
    <path d="M8 17l4 4l4 -4"/>
    <path d="M12 3l0 18"/>
  </g>
</svg>`
}

function makeRotateSvg(rotateZ: number): string {
  const degrees = (rotateZ * 180) / Math.PI
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 34 34"
     fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
  <g transform="rotate(${degrees} 8 8)">
    <path d="M1,14.76l4,4,4-4"/>
    <path d="M14.61,1l4,4-4,4"/>
    <path d="M18.61,5h-6.02c-4.19,0-7.59,3.4-7.59,7.59v6.17"/>
  </g>
</svg>`
}

/**
 * Default cursor definitions for all cursor kinds.
 * Users can override these by providing custom cursors in plugin options.
 */
export const CURSORS: Record<string, CursorDef> = {
  [CursorKind.Drag]: {
    makeSvg: () => DRAG_SVG,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
  [CursorKind.NS]: {
    makeSvg: makeResizeSvg,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
  [CursorKind.EW]: {
    makeSvg: makeResizeSvg,
    hotspot: [12, 12],
    rotationOffset: Math.PI / 2,
  },
  [CursorKind.NWSE]: {
    makeSvg: makeResizeSvg,
    hotspot: [12, 12],
    rotationOffset: -Math.PI / 4,
  },
  [CursorKind.NESW]: {
    makeSvg: makeResizeSvg,
    hotspot: [12, 12],
    rotationOffset: Math.PI / 4,
  },
  [CursorKind.RotateNW]: {
    makeSvg: makeRotateSvg,
    hotspot: [16, 16],
    rotationOffset: 0,
  },
  [CursorKind.RotateNE]: {
    makeSvg: makeRotateSvg,
    hotspot: [16, 16],
    rotationOffset: Math.PI / 2,
  },
  [CursorKind.RotateSW]: {
    makeSvg: makeRotateSvg,
    hotspot: [16, 16],
    rotationOffset: -Math.PI / 2,
  },
  [CursorKind.RotateSE]: {
    makeSvg: makeRotateSvg,
    hotspot: [16, 16],
    rotationOffset: -Math.PI,
  },
}

import { CursorKind } from './types'

const DRAG_CURSOR_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33.94 33.94">
  <defs>
    <style>
      .cls-1, .cls-2 {
        fill: none;
      }

      .cls-2 {
        stroke: #000;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2px;
      }
    </style>
  </defs>
  <g id="Layer_1-2" data-name="Layer 1">
    <path class="cls-1" d="M16.97,0l16.97,16.97-16.97,16.97L0,16.97,16.97,0Z"/>
    <path class="cls-2" d="M25.46,14.14l2.83,2.83-2.83,2.83"/>
    <path class="cls-2" d="M19.8,16.97h8.49"/>
    <path class="cls-2" d="M8.49,19.8l-2.83-2.83,2.83-2.83"/>
    <path class="cls-2" d="M5.66,16.97h14.57"/>
    <path class="cls-2" d="M14.14,25.46l2.83,2.83,2.83-2.83"/>
    <path class="cls-2" d="M16.97,19.8v8.49"/>
    <path class="cls-2" d="M19.8,8.49l-2.83-2.83-2.83,2.83"/>
    <path class="cls-2" d="M16.97,5.66v15.14"/>
  </g>
</svg>`

function NS_CURSOR_SVG(rotateZ: number): string {
  return `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2px"  stroke-linecap="round"  stroke-linejoin="round"><g transform="rotate(${(rotateZ * 180) / Math.PI} 12 12)"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7l4 -4l4 4" /><path d="M8 17l4 4l4 -4" /><path d="M12 3l0 18" /></g></svg>`
}

function NW_CURSOR_SVG(rotateZ: number): string {
  return `<svg id="Layer_2" data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 34 34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2px">
  <g id="Layer_1-2" data-name="Layer 1" transform="rotate(${(rotateZ * 180) / Math.PI} 8 8)">
    <path class="cls-1" d="M1,14.76l4,4,4-4"/>
    <path class="cls-1" d="M14.61,1l4,4-4,4"/>
    <path class="cls-1" d="M18.61,5h-6.02c-4.19,0-7.59,3.4-7.59,7.59v6.17"/>
  </g>
</svg>`
}

export function getCursorSvg(icon: CursorKind, rotateZ: number): string {
  switch (icon) {
    case CursorKind.Drag:
      return `url("data:image/svg+xml,${encodeURIComponent(DRAG_CURSOR_SVG)}") 12 12, auto`
    case CursorKind.EW:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ + Math.PI / 2))}") 12 12, auto`
    case CursorKind.NS:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ))}") 12 12, auto`
    case CursorKind.NWSE:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ - Math.PI / 4))}") 12 12, auto`
    case CursorKind.NESW:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ + Math.PI / 4))}") 12 12, auto`
    case CursorKind.RotateNW:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ))}") 16 16, auto`
    case CursorKind.RotateNE:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ + Math.PI / 2))}") 16 16, auto`
    case CursorKind.RotateSW:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ - Math.PI / 2))}") 16 16, auto`
    case CursorKind.RotateSE:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ - Math.PI))}") 16 16, auto`
  }
}

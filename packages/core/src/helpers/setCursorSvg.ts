import { CursorIcon } from '../types'

const POINTER_CURSOR_SVG = `<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4.35 4.75" width="20" height="20"><defs><style>.cls-1{stroke:#fff;stroke-miterlimit:10;stroke-width:.25px;}</style></defs><path class="cls-1" d="M2.39,2.88s-.04.01-.05.02c-.01,0-.02.01-.03.02,0,.01-.02.02-.03.05l-.77,1.44c-.07.13-.1.19-.14.2-.03.01-.07,0-.1-.01-.03-.02-.05-.09-.09-.23L.16.41c-.03-.13-.05-.19-.03-.23.02-.03.04-.05.08-.06.04,0,.1.02.21.08l3.59,1.94c.13.07.19.1.2.14.01.03,0,.07-.01.1-.02.03-.09.05-.23.09l-1.58.4Z"/></svg>`
const HAND_CURSOR_SVG = `<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4.08 4.75" width="24" height="24"><defs><style>.cls-1{fill:#fff;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:.25px;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;stroke-width:.51px;}</style></defs><path class="cls-1" d="M.89,2.25v.63M.89,2.25V.75c0-.21.17-.38.38-.38s.38.17.38.38M.89,2.25c0-.21-.17-.37-.38-.37s-.38.17-.38.37v.5c0,1.04.86,1.87,1.91,1.87s1.91-.84,1.91-1.87v-1.25c0-.21-.17-.38-.38-.38s-.38.17-.38.38M1.66.75v1.38M1.66.75v-.25c0-.21.17-.38.38-.38s.38.17.38.38v.25M2.42.75v1.38M2.42.75c0-.21.17-.38.38-.38s.38.17.38.38v.75M3.19,1.5v.63"/><line class="cls-2" x1="2.8" y1=".77" x2="2.8" y2="2.03"/><line class="cls-2" x1="2.04" y1=".64" x2="2.04" y2="2.02"/><line class="cls-2" x1="1.27" y1=".84" x2="1.27" y2="2.29"/></svg>`

const MOVE_CURSOR_SVG = `<?xml version="1.0" encoding="UTF-8"?>
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

const CROSSHAIR_CURSOR_SVG = `<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-crosshair"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /><path d="M9 12l6 0" /><path d="M12 9l0 6" /></svg>`

function getCursorSvg(icon: CursorIcon, rotateZ: number): string {
  switch (icon) {
    case CursorIcon.Select:
      return `url("data:image/svg+xml,${encodeURIComponent(POINTER_CURSOR_SVG)}") 2 1, auto`
    case CursorIcon.Hand:
      return `url("data:image/svg+xml,${encodeURIComponent(HAND_CURSOR_SVG)}") 12 12, auto`
    case CursorIcon.Move:
      return `url("data:image/svg+xml,${encodeURIComponent(MOVE_CURSOR_SVG)}") 12 12, auto`
    case CursorIcon.Crosshair:
      return `url("data:image/svg+xml,${encodeURIComponent(CROSSHAIR_CURSOR_SVG)}") 12 12, auto`
    case CursorIcon.EW:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ + Math.PI / 2))}") 12 12, auto`
    case CursorIcon.NS:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ))}") 12 12, auto`
    case CursorIcon.NWSE:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ - Math.PI / 4))}") 12 12, auto`
    case CursorIcon.NESW:
      return `url("data:image/svg+xml,${encodeURIComponent(NS_CURSOR_SVG(rotateZ + Math.PI / 4))}") 12 12, auto`
    case CursorIcon.RotateNW:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ))}") 16 16, auto`
    case CursorIcon.RotateNE:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ + Math.PI / 2))}") 16 16, auto`
    case CursorIcon.RotateSW:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ - Math.PI / 2))}") 16 16, auto`
    case CursorIcon.RotateSE:
      return `url("data:image/svg+xml,${encodeURIComponent(NW_CURSOR_SVG(rotateZ - Math.PI))}") 16 16, auto`
  }
}

export function setCursorSvg(icon: CursorIcon, rotateZ = 0): void {
  document.body.style.cursor = getCursorSvg(icon, rotateZ)
}

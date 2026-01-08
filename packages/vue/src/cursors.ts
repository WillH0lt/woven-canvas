import { type CursorDef } from "@infinitecanvas/editor";

// Cursor SVGs
const HAND_CURSOR_SVG = `<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4.08 4.75" width="24" height="24"><defs><style>.cls-1{fill:#fff;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:.25px;}.cls-2{fill:none;stroke:#fff;stroke-miterlimit:10;stroke-width:.51px;}</style></defs><path class="cls-1" d="M.89,2.25v.63M.89,2.25V.75c0-.21.17-.38.38-.38s.38.17.38.38M.89,2.25c0-.21-.17-.37-.38-.37s-.38.17-.38.37v.5c0,1.04.86,1.87,1.91,1.87s1.91-.84,1.91-1.87v-1.25c0-.21-.17-.38-.38-.38s-.38.17.38.38M1.66.75v1.38M1.66.75v-.25c0-.21.17-.38.38-.38s.38.17.38.38v.25M2.42.75v1.38M2.42.75c0-.21.17-.38.38-.38s.38.17.38.38v.75M3.19,1.5v.63"/><line class="cls-2" x1="2.8" y1=".77" x2="2.8" y2="2.03"/><line class="cls-2" x1="2.04" y1=".64" x2="2.04" y2="2.02"/><line class="cls-2" x1="1.27" y1=".84" x2="1.27" y2="2.29"/></svg>`;
const CROSSHAIR_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /><path d="M9 12l6 0" /><path d="M12 9l0 6" /></svg>`;

/** Cursor kind constants for toolbar tools */
export const CursorKind = {
  Select: "select",
  Hand: "hand",
  Crosshair: "crosshair",
} as const;

export const CURSORS: Record<string, CursorDef> = {
  [CursorKind.Hand]: {
    makeSvg: () => HAND_CURSOR_SVG,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
  [CursorKind.Crosshair]: {
    makeSvg: () => CROSSHAIR_CURSOR_SVG,
    hotspot: [12, 12],
    rotationOffset: 0,
  },
};

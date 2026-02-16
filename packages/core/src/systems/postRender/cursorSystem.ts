import { type Context, defineQuery, getResources } from '@woven-ecs/core'

import { defineEditorSystem } from '../../EditorSystem'
import { Cursor, Frame } from '../../singletons'
import type { CursorDef, EditorResources } from '../../types'

const cursorQuery = defineQuery((q) => q.tracking(Cursor))

/**
 * Get a cursor CSS value for a given cursor kind and rotation.
 * @param cursors - The cursor definitions map (from resources)
 * @param kind - The cursor kind
 * @param rotateZ - The rotation angle in radians
 * @returns CSS cursor value string
 */
export function getCursorSvg(cursors: Record<string, CursorDef>, kind: string, rotateZ: number): string {
  const def = cursors[kind]
  if (!def) {
    console.warn(`No cursor definition found for kind: ${kind}`)
    return 'auto'
  }

  const svg = def.makeSvg(rotateZ + def.rotationOffset)
  return `url("data:image/svg+xml,${encodeURIComponent(svg.trim())}") ${def.hotspot[0]} ${def.hotspot[1]}, auto`
}

/**
 * Post-render cursor system - applies the current cursor to the DOM.
 *
 * Runs late in the render phase (priority: -100) to update document.body.style.cursor based on:
 * 1. contextCursorKind (hover/drag cursor) - highest priority
 * 2. cursorKind (tool cursor) - medium priority
 * 3. Default cursor - fallback
 *
 * Resolves cursor kind + rotation to SVG using getCursorSvg at render time,
 * allowing cursor definitions to be changed dynamically.
 */
export const cursorSystem = defineEditorSystem({ phase: 'render', priority: -100 }, (ctx: Context) => {
  const changedCursors = cursorQuery.changed(ctx)

  const frame = Frame.read(ctx)

  // If no cursor changes, skip updating DOM
  if (changedCursors.length === 0 && frame.number !== 1) {
    return
  }

  const { cursorKind, rotation } = Cursor.getEffective(ctx)

  // If no cursor kind set, use default
  if (!cursorKind) {
    document.body.style.cursor = 'default'
    return
  }

  // Get cursors from resources and resolve to SVG
  const { editor } = getResources<EditorResources>(ctx)
  const cursorValue = getCursorSvg(editor.cursors, cursorKind, rotation)

  // Apply to DOM
  document.body.style.cursor = cursorValue
})

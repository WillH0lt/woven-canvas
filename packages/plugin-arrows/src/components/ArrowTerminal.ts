import { defineCanvasComponent, field } from '@infinitecanvas/core'

/**
 * ArrowTerminal component - marks an entity as an arrow snap terminal.
 *
 * Arrow terminals are visual indicators that appear on blocks when
 * dragging arrow handles, showing valid snap points for connections.
 */
export const ArrowTerminal = defineCanvasComponent(
  { name: 'arrowTerminal' },
  {
    /** Reference to the block this terminal belongs to */
    blockEntity: field.ref(),

    /** Index of this terminal in the block's connectors.terminals array */
    terminalIndex: field.uint8().default(0),
  },
)

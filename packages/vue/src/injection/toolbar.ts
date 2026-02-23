import type { ComputedRef, InjectionKey, Ref } from 'vue'

/** Context provided by Toolbar */
export interface ToolbarContext {
  /** The currently active tool name */
  activeTool: ComputedRef<string>
  /** Whether a tool is currently being held (pointer down) */
  heldTool: Ref<string | null>
  /** Set the active tool */
  setTool: (toolName: string, snapshot?: string, cursor?: string) => void
  /** Handle drag-out for a tool (creates block and starts dragging) */
  dragOutTool: (snapshot: string) => void
  /** Register a pointer down on a tool button */
  onToolPointerDown: (toolName: string, snapshot?: string) => void
  /** Register a pointer up on a tool button */
  onToolPointerUp: () => void
}

/** Injection key for Toolbar context */
export const TOOLBAR_KEY: InjectionKey<ToolbarContext> = Symbol.for('__woven_canvas_toolbar__')

import { defineEditorSystem, getPluginResources, on, Redo, Undo } from '@woven-canvas/core'
import { deselectAll } from '@woven-canvas/plugin-selection'

import { PLUGIN_NAME } from '../constants'
import type { EditingPluginResources } from '../EditingPlugin'

export const undoRedoSystem = defineEditorSystem({ phase: 'update' }, (ctx) => {
  const { store } = getPluginResources<EditingPluginResources>(ctx, PLUGIN_NAME)
  on(ctx, Undo, () => {
    if (store.canUndo()) {
      deselectAll(ctx)
      store.undo()
    }
  })
  on(ctx, Redo, () => {
    if (store.canRedo()) {
      deselectAll(ctx)
      store.redo()
    }
  })
})

<script setup lang="ts">
import '@woven-canvas/vue/style.css'
import { type Editor, Block, Text, Synced, addComponent, createEntity, RankBounds } from '@woven-canvas/core'
import { WovenCanvas, Toolbar, SelectTool, HandTool, TextTool, FloatingMenuBar } from '@woven-canvas/vue'
import Highlight from '@tiptap/extension-highlight'
import HighlightButton from './HighlightButton.vue'

// A host-app mark woven-canvas knows nothing about. `multicolor` stores the color in
// `data-color`, so it round-trips as `<mark data-color="…">`. Defined once at module
// scope so the same stable instance is handed to the editor on every render.
const highlight = Highlight.configure({ multicolor: true })

function handleReady(editor: Editor) {
  // Seed a text block so there's something to highlight.
  editor.nextTick((ctx) => {
    const entityId = createEntity(ctx)
    addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() })
    addComponent(ctx, entityId, Text, {
      // Seed with a highlight already applied — the `highlight` mark renders as
      // `<mark data-color="…">` (multicolor); the inline background-color makes it
      // visible in the static (non-editing) render too.
      content:
        '<p>Some words are <mark data-color="#FEF08A" style="background-color: #FEF08A">already highlighted</mark>.</p>',
      constrainWidth: true,
    })
    addComponent(ctx, entityId, Block, {
      tag: 'text',
      position: [80, 120],
      size: [320, 58],
      rank: RankBounds.genNext(ctx),
    })
  })
}
</script>

<template>
  <!-- Register the app-defined Highlight mark in the text editor (and the parser used
       for selected-but-not-editing blocks) via `text-options`. -->
  <WovenCanvas :text-options="{ extensions: [highlight] }" @ready="handleReady">
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <HandTool />
        <TextTool />
      </Toolbar>
    </template>

    <!-- Override the text formatting menu with our highlight button. -->
    <template #floating-menu>
      <FloatingMenuBar>
        <template #button:text="{ entityIds }">
          <HighlightButton :entity-ids="entityIds" />
        </template>
      </FloatingMenuBar>
    </template>
  </WovenCanvas>
</template>

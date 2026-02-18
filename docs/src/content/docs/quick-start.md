---
title: Quick Start
description: Get up and running with Woven Canvas in minutes
---

## Installation

```bash
npm install @woven-canvas/vue
```

## Basic Setup

Create a Vue component that renders the canvas:

```vue
<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
</script>

<template>
  <WovenCanvas style="width: 100vw; height: 100vh" />
</template>
```

That's all you need for a fully functional infinite canvas with:

- **Pan & Zoom** — Scroll to pan, pinch or ctrl+scroll to zoom
- **Selection** — Click to select, shift+click for multi-select, drag to box-select
- **Shapes** — Rectangles, ellipses, triangles, and more
- **Text** — Rich text with formatting options
- **Images** — Drag and drop or paste from clipboard
- **Pen** — Freehand drawing with pressure sensitivity
- **Arrows** — Connect blocks with elbow arrows

## Listening for Ready

The canvas emits a `ready` event when initialization is complete:

```vue
<script setup lang="ts">
import { WovenCanvas, type Editor } from '@woven-canvas/vue'
import { Camera } from '@woven-canvas/core'
import { SelectAll } from '@woven-canvas/plugin-selection'
import type { CanvasStore } from '@woven-ecs/canvas-store'

function onReady(editor: Editor, store: CanvasStore) {
  console.log('Canvas is ready!')

  // Pan and zoom the camera
  editor.nextTick((ctx) => {
    const camera = Camera.write(ctx)
    camera.left = 100
    camera.top = 50
    camera.zoom = 1.5

    // Issue a command
    editor.command(SelectAll)
  })
}
</script>

<template>
  <WovenCanvas @ready="onReady" />
</template>
```

## Adding Persistence

Save the canvas state to IndexedDB so it persists across page reloads:

```vue
<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'

const storeOptions = {
  persistence: {
    documentId: 'my-canvas',
  },
}
</script>

<template>
  <WovenCanvas :store="storeOptions" />
</template>
```

## Customizing the Background

Choose between grid, dots, or a custom background:

```vue
<template>
  <!-- Grid background -->
  <WovenCanvas :background="{ kind: 'grid' }" />

  <!-- Dot pattern -->
  <WovenCanvas :background="{ kind: 'dots' }" />

  <!-- Custom background via slot -->
  <WovenCanvas>
    <template #background>
      <div class="my-custom-background" />
    </template>
  </WovenCanvas>
</template>
```

## Accessing Editor Context

Use composables inside the canvas to access reactive ECS data:

```vue
<script setup lang="ts">
import { WovenCanvas, useEditorContext, useSingleton } from '@woven-canvas/vue'
import { Camera } from '@woven-canvas/core'

// Inside a component rendered within WovenCanvas
const { getEditor, nextEditorTick } = useEditorContext()
const camera = useSingleton(Camera)

// React to camera changes
watchEffect(() => {
  console.log('Zoom level:', camera.value?.zoom)
})
</script>
```

## Next Steps

Now that you have a working canvas, learn how it works:

- [The Editor](/learn/editor/) — Understand the core architecture
- [Blocks](/learn/blocks/) — How canvas elements work
- [Tools](/learn/tools/) — How toolbar tools work
- [User Interface](/learn/user-interface/) — Customize the UI

Or jump straight to examples:

- [Custom Block](/examples/custom-block/) — Build your own block type
- [Custom Tool](/examples/custom-tool/) — Add a toolbar button
- [Plugin](/examples/plugin/) — Package everything into a reusable module

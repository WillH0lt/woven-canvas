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
import { WovenCanvas } from "@woven-canvas/vue";
import "@woven-canvas/vue/style.css";
</script>

<template>
  <WovenCanvas />
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

## Local-First Persistence

Woven Canvas persistence is built to be local-first. All changes are saved instantly locally -- your canvas works offline, survives page reloads, and syncs automatically when connectivity is restored.

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";
</script>

<template>
  <WovenCanvas
    :store="{
      // Save to IndexedDB for offline persistence
      persistence: {
        documentId: 'my-canvas', // Unique ID for this document
      },

      history: true, // enable undo/redo history
    }"
  />
</template>
```

### Real-Time Multiplayer

Add real-time collaboration by connecting to a sync server.

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";

const clientId = crypto.randomUUID(); // Unique ID for this client
</script>

<template>
  <WovenCanvas
    :store="{
    ...
    // Real-time sync with other users
    websocket: {
      url: 'wss://your-sync-server.com',  // WebSocket server URL
      documentId: 'shared-canvas',
      clientId,
    },
  }"
  />
</template>
```

With this setup, users can work offline and their changes automatically merge when they reconnect. Woven Canvas uses [@woven-ecs/canvas-store](https://github.com/WillH0lt/woven-ecs/tree/main/packages/canvas-store) to handle syncing, see the [Canvas Store docs](https://woven-ecs.dev/canvas-store/) for more details on configuring the server and customizing sync behavior.

## Reactive Composables

Woven Canvas exposes Vue composables for reactive access to ECS state. Use these inside components rendered within `<WovenCanvas>`.

### Accessing Editor Context

Track global state with `useSingleton`, or read a specific entity's component with `useComponent`:

```vue
<script setup lang="ts">
import { watchEffect } from "vue";
import { useSingleton, useComponent } from "@woven-canvas/vue";
import { Camera, Block, type EntityId } from "@woven-canvas/core";

const props = defineProps<{ blockId: EntityId }>();

// Track global editor state
const camera = useSingleton(Camera);

// Track a specific block's data
const block = useComponent(() => props.blockId, Block);

watchEffect(() => {
  console.log(`Zoom: ${camera.value.zoom}`);
  console.log(`Block position: ${block.value?.position}`);
});
</script>
```

### Reactive Queries

Query entities by their components with `useQuery`. The result updates automatically as entities are added, removed, or modified:

```vue
<script setup lang="ts">
import { watchEffect } from "vue";
import { useQuery } from "@woven-canvas/vue";
import { Block } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Query all selected blocks
const selectedBlocks = useQuery([Block, Selected]);

watchEffect(() => {
  console.log(`${selectedBlocks.value.length} blocks selected`);
});
</script>
```

## Next Steps

Now that you have a working canvas, learn how it works:

- [Architecture](/learn/architecture/) — Understand the core architecture
- [Blocks](/learn/blocks/) — How canvas elements work
- [Tools](/learn/tools/) — How toolbar tools work
- [User Interface](/learn/user-interface/) — Customize the UI

Or jump straight to examples:

- [Create a Custom Block](/examples/create-a-custom-block/) — Build your own block type
- [Using the Editor API](/examples/editor-api/) — Programmatically create and update blocks
- [Create a Plugin](/examples/create-a-plugin/) — Package behavior into a reusable module

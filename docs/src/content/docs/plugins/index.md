---
title: Plugins
description: Extend the canvas with built-in and custom plugins
---

Plugins extend the Woven Canvas editor with new tools, behaviors, and functionality. Each plugin bundles together components, systems, commands, and keybinds into a reusable package.

## Built-in Plugins

Woven Canvas includes several built-in plugins that provide core functionality:

| Plugin                                       | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| [Selection](/plugins/selection/)             | Core selection, transform, clipboard, and z-ordering |
| [Canvas Controls](/plugins/canvas-controls/) | Pan, zoom, and scroll navigation                     |
| [Pen](/plugins/pen/)                         | Freehand drawing with pressure sensitivity           |
| [Eraser](/plugins/eraser/)                   | Object eraser tool                                   |
| [Arrows](/plugins/arrows/)                   | Arc and elbow arrow connectors                       |

## Using Plugins

Plugins are passed to the `WovenCanvas` component via the `editor` prop:

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";
import { SelectionPlugin } from "@woven-canvas/plugin-selection";
import { CanvasControlsPlugin } from "@woven-canvas/plugin-canvas-controls";
import { PenPlugin } from "@woven-canvas/plugin-pen";
</script>

<template>
  <WovenCanvas
    :editor="{
      plugins: [SelectionPlugin(), CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 5 }), PenPlugin()],
    }"
  />
</template>
```

Most plugins can be used with default options (no parentheses) or customized:

```typescript
// Default options
plugins: [SelectionPlugin()];

// Custom options
plugins: [
  SelectionPlugin({
    edgeScrolling: {
      enabled: true,
      edgeSizePx: 20,
    },
  }),
];
```

## Plugin Architecture

Each plugin can provide:

- **Components** — Custom ECS components for data storage
- **Block definitions** — Configure how blocks behave (resize, rotate, etc.)
- **Systems** — Update logic that runs each frame
- **Keybinds** — Keyboard shortcut mappings
- **Commands** — Actions that can be triggered programmatically
- **Resources** — Configuration options accessible at runtime

For details on building your own plugins, see [Creating Custom Plugins](/plugins/custom-plugin/).

For a deep dive into the Entity Component System architecture, see the [woven-ecs documentation](https://woven-ecs.dev).

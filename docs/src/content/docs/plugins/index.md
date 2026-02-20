---
title: Plugins
description: Extend the canvas with built-in and custom plugins
---

Plugins extend the Woven Canvas editor with new tools, behaviors, and functionality. Each plugin bundles together components, systems, commands, and keybinds into a reusable package.

## Built-in Plugins

Woven Canvas includes several built-in plugins that provide core functionality:

| Plugin                                       | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| [Core](/plugins/core/)                       | Input handling, block types, and essential systems   |
| [Selection](/plugins/selection/)             | Core selection, transform, clipboard, and z-ordering |
| [Canvas Controls](/plugins/canvas-controls/) | Pan, zoom, and scroll navigation                     |
| [Pen](/plugins/pen/)                         | Freehand drawing with pressure sensitivity           |
| [Eraser](/plugins/eraser/)                   | Object eraser tool                                   |
| [Arrows](/plugins/arrows/)                   | Arc and elbow arrow connectors                       |

## Using Plugins

All built-in plugins are included by default when using `WovenCanvas`. You can configure or disable them via the `pluginOptions` prop:

```vue
<template>
  <!-- All plugins enabled with defaults -->
  <WovenCanvas />

  <!-- Disable specific plugins -->
  <WovenCanvas :plugin-options="{ pen: false, eraser: false }" />

  <!-- Configure plugin options -->
  <WovenCanvas
    :plugin-options="{
      selection: { edgeScrolling: { edgeSizePx: 20 } },
      controls: { minZoom: 0.1, maxZoom: 5 },
    }"
  />
</template>
```

To add custom plugins alongside the built-ins, use the `editor` prop:

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";
import { MyCustomPlugin } from "./MyCustomPlugin";
</script>

<template>
  <WovenCanvas :editor="{ plugins: [MyCustomPlugin()] }" />
</template>
```

## Plugin Architecture

Each plugin can provide:

- **Components** — Custom ECS components for data storage
- **Block definitions** — Configure how blocks behave (resize, rotate, etc.)
- **Systems** — Update logic that runs each frame
- **Keybinds** — Keyboard shortcut mappings
- **Commands** — Actions that can be triggered programmatically
- **Resources** — Configuration options accessible at runtime

For details on building your own plugins, see [Creating Plugins](/learn/creating-plugins/).

For a deep dive into the Entity Component System architecture, see the [woven-ecs documentation](https://woven-ecs.dev).

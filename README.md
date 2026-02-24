<p align="center">
  <img src="docs/src/assets/logo.png" alt="Woven Canvas Logo" width="50" />
</p>

<p align="center">
  <a href="https://github.com/WillH0lt/woven-canvas/actions/workflows/ci.yaml"><img src="https://github.com/WillH0lt/woven-canvas/actions/workflows/ci.yaml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@woven-canvas/core"><img src="https://img.shields.io/npm/v/@woven-canvas/core" alt="npm" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

# Woven Canvas

An infinite canvas SDK for Vue.

- **Plugin Architecture**: Choose from several first-party plugins or create your own for custom tools and features.
- **Fully Customizable**: Customizable toolbars, menus, and canvas controls out of the box.
- **Multiplayer Collaboration**: Real-time canvas editing with live cursors, presence indicators, and local-first offline support.
- **Infinite Canvas Essentials**: Everything you need to build an infinite canvas app, including pan/zoom, selection box, freehand drawing, alt+drag, and more.

## Installation

```bash
npm install @woven-canvas/core @woven-canvas/vue
```

## Quick Start

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";
import "@woven-canvas/vue/style.css";
</script>

<template>
  <WovenCanvas />
</template>
```

## Packages

| Package                                           | Description                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| [@woven-canvas/core](./packages/core)             | Framework-agnostic infinite canvas core with ECS-based architecture |
| [@woven-canvas/vue](./packages/vue)               | Vue 3 components for building infinite canvas applications          |
| [@woven-canvas/math](./packages/math)             | Math utilities for 2D vector operations                             |
| [@woven-canvas/asset-sync](./packages/asset-sync) | Asset management with upload queueing and caching                   |

### Plugins

| Plugin                                                                    | Description                                |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| [@woven-canvas/plugin-selection](./packages/plugin-selection)             | Select, move, and resize objects           |
| [@woven-canvas/plugin-pen](./packages/plugin-pen)                         | Freehand drawing with pressure sensitivity |
| [@woven-canvas/plugin-arrows](./packages/plugin-arrows)                   | Connectors and arrow tools                 |
| [@woven-canvas/plugin-eraser](./packages/plugin-eraser)                   | Eraser tool for removing content           |
| [@woven-canvas/plugin-canvas-controls](./packages/plugin-canvas-controls) | Pan, zoom, and canvas navigation           |

## Examples

| Example                             | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| [Vue Editor](./examples/editor-vue) | Full-featured whiteboard editor built with Vue |

## Local Development

```bash
git clone https://github.com/WillH0lt/woven-canvas.git
cd woven-canvas
pnpm install
pnpm build
pnpm test
```

## License

MIT License.

## Community

- [GitHub Issues](https://github.com/WillH0lt/woven-canvas/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/WillH0lt/woven-canvas/discussions) - Questions and ideas

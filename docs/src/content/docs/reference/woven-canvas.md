---
title: WovenCanvas
description: API reference for the WovenCanvas component
---

The main canvas component that provides a fully-featured infinite canvas.

## Import

```typescript
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `store` | `CanvasStoreOptions` | — | Persistence, history, and multiplayer configuration |
| `editor` | `EditorOptionsInput` | — | Editor options (passed through to Editor constructor) |
| `background` | `BackgroundOptions` | — | Background style (grid/dots) |
| `assetProvider` | `AssetProvider` | `LocalAssetProvider` | Image upload provider |
| `pluginOptions` | `PluginOptions` | — | Options for built-in plugins (see below) |

### Editor Options

The `editor` prop accepts all options from `EditorOptionsInput`:

| Option | Type | Description |
|--------|------|-------------|
| `maxEntities` | `number` | Maximum number of entities (default: 10000) |
| `user` | `UserDataInput` | User identity for presence |
| `blockDefs` | `BlockDefInput[]` | Custom block definitions |
| `keybinds` | `Keybind[]` | Additional keyboard shortcuts |
| `cursors` | `Record<string, CursorDef>` | Custom cursor definitions |
| `components` | `AnyCanvasComponentDef[]` | Custom components to register |
| `singletons` | `AnyCanvasSingletonDef[]` | Custom singletons to register |
| `systems` | `EditorSystem[]` | Custom systems to register |
| `plugins` | `EditorPluginInput[]` | Additional plugins |
| `fonts` | `FontFamilyInput[]` | Custom fonts to load |
| `grid` | `GridOptionsInput` | Grid snapping options |

### Plugin Options

The `pluginOptions` prop configures built-in plugins. Pass `false` to disable a plugin entirely:

| Option | Type | Description |
|--------|------|-------------|
| `controls` | `CanvasControlsOptionsInput \| false` | Pan/zoom control options |
| `selection` | `SelectionPluginOptionsInput \| false` | Selection behavior options |
| `eraser` | `EraserPluginOptions \| false` | Eraser tool options |
| `pen` | `false` | Disable pen tool (no options) |
| `arrows` | `ArrowsPluginOptions \| false` | Arrow tool options |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `(editor: Editor, store: CanvasStore)` | Emitted when initialization completes |

## Slots

### Block Slots

Override rendering for any block type:

```vue
<template #block:sticky-note="props">
  <MyCustomStickyNote v-bind="props" />
</template>
```

Slot props (`BlockData`):

```typescript
interface BlockData {
  entityId: number
  block: {
    tag: string
    position: [number, number]
    size: [number, number]
    rank: string
    rotateZ: number
    flip: [boolean, boolean]
  }
  stratum: 'background' | 'content' | 'overlay'
  selected: boolean
  hovered: boolean
  edited: boolean
  held: { sessionId: string } | null
  opacity: { value: number } | null
  connector: { /* ... */ } | null
}
```

### UI Slots

| Slot | Props | Description |
|------|-------|-------------|
| `toolbar` | — | Replace the entire toolbar |
| `floating-menu` | — | Replace the floating menu |
| `background` | `{ background }` | Replace the background |
| `user-presence` | `{ users }` | Replace user avatars |
| `user-cursors` | `{ users, currentSessionId, camera }` | Replace user cursors |
| `offline-indicator` | `{ isOnline }` | Replace offline indicator |
| `version-mismatch` | `{ versionMismatch }` | Replace version warning |
| `back-to-content` | — | Replace "back to content" button |
| `loading` | `{ isLoading }` | Replace loading overlay |

## Example

```vue
<script setup lang="ts">
import { WovenCanvas, type Editor } from '@woven-canvas/vue'
import type { CanvasStore } from '@woven-ecs/canvas-store'

const storeOptions = {
  persistence: { documentId: 'my-canvas' },
}

function onReady(editor: Editor, store: CanvasStore) {
  console.log('Canvas ready!')
}
</script>

<template>
  <WovenCanvas
    :store="storeOptions"
    :editor="{ grid: { enabled: true } }"
    :plugin-options="{ controls: { maxZoom: 5 } }"
    :background="{ kind: 'dots' }"
    @ready="onReady"
  >
    <template #block:my-block="props">
      <MyBlock v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

### Disabling Built-in Plugins

```vue
<template>
  <WovenCanvas
    :plugin-options="{
      pen: false,
      eraser: false,
      arrows: false,
    }"
  />
</template>
```

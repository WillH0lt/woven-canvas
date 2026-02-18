---
title: Persistence
description: Saving and loading canvas state
---

Woven Canvas provides built-in persistence to IndexedDB and optional server synchronization. Your canvas automatically saves locally and can sync to a server for backup and collaboration.

## Local Persistence

Enable local persistence with a document ID:

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

Changes are automatically saved to IndexedDB. When the page reloads, the canvas restores to its previous state.

## Multiple Documents

Use different document IDs for separate canvases:

```vue
<template>
  <WovenCanvas :store="{ persistence: { documentId: 'project-a' } }" />
  <WovenCanvas :store="{ persistence: { documentId: 'project-b' } }" />
</template>
```

## Undo/Redo

History is automatically tracked. Use keyboard shortcuts or commands:

- **Undo**: `Ctrl+Z` (or `Cmd+Z` on Mac)
- **Redo**: `Ctrl+Y` or `Ctrl+Shift+Z`

Programmatically:

```typescript
import { Undo, Redo } from '@woven-canvas/core'

nextEditorTick((ctx) => {
  Undo.spawn(ctx)  // Undo last action
  Redo.spawn(ctx)  // Redo last undone action
})
```

## Sync Behaviors

Each component can specify how it should be synchronized:

| Behavior | Persisted | Synced | Use Case |
|----------|-----------|--------|----------|
| `persist` | Yes | Yes | Document content |
| `ephemeral` | No | Yes | Cursor position, selection |
| `local` | Yes | No | User preferences |
| `none` | No | No | Temporary UI state |

Define sync behavior when creating components:

```typescript
import { defineCanvasComponent, field } from '@woven-canvas/vue'

// Synced and persisted (default)
const DocumentData = defineCanvasComponent('doc-data', {
  title: field.string(),
}, { sync: 'persist' })

// Synced but not persisted
const CursorState = defineCanvasComponent('cursor', {
  x: field.float32(),
  y: field.float32(),
}, { sync: 'ephemeral' })

// Local only
const UserPrefs = defineCanvasComponent('prefs', {
  theme: field.string().default('dark'),
}, { sync: 'local' })

// Runtime only
const HoverState = defineCanvasComponent('hover', {
  entityId: field.uint32(),
}, { sync: 'none' })
```

## Server Sync

Connect to a WebSocket server for backup and collaboration:

```vue
<script setup lang="ts">
const storeOptions = {
  persistence: {
    documentId: 'shared-doc',
  },
  websocket: {
    url: 'wss://your-server.com/sync',
    documentId: 'shared-doc',
  },
}
</script>

<template>
  <WovenCanvas :store="storeOptions" />
</template>
```

The canvas works offline by default. Changes are queued and synced when reconnected.

## Monitoring Connection Status

Track online/offline state:

```vue
<template>
  <WovenCanvas :store="storeOptions">
    <template #offline-indicator="{ isOnline }">
      <div v-if="!isOnline" class="offline-badge">
        Offline - changes will sync when reconnected
      </div>
    </template>
  </WovenCanvas>
</template>
```

Or via callbacks:

```typescript
const storeOptions = {
  websocket: {
    url: 'wss://...',
    documentId: 'my-doc',
    onConnectivityChange: (online) => {
      console.log('Online:', online)
    },
  },
}
```

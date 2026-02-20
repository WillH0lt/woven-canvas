---
title: Canvas Store
description: Persistence, undo/redo, and real-time multiplayer
---

The canvas store is a synchronization layer that persists data to IndexedDB, tracks undo/redo history, and enables real-time multiplayer via WebSocket.

For detailed documentation, see the [canvas-store docs](https://woven-ecs.dev/canvas-store/introduction/).

## Persistence

Save canvas state to IndexedDB by providing a document ID:

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";

const storeOptions = {
  persistence: {
    documentId: "my-canvas",
  },
};
</script>

<template>
  <WovenCanvas :store="storeOptions" />
</template>
```

Changes save automatically. When the page reloads, the canvas restores its previous state.

Use different document IDs for separate canvases:

```vue
<template>
  <WovenCanvas :store="{ persistence: { documentId: 'project-a' } }" />
  <WovenCanvas :store="{ persistence: { documentId: 'project-b' } }" />
</template>
```

## Undo/Redo

Enable undo/redo history with the `history` option:

```typescript
const storeOptions = {
  ...
  history: true,
};
```

## Real-Time Multiplayer

Connect to a WebSocket server for collaborative editing:

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";

const storeOptions = {
  ...
  websocket: {
    url: "wss://your-server.com/sync",
    documentId: "shared-canvas",
    clientId: crypto.randomUUID(),
  },
};
</script>

<template>
  <WovenCanvas :store="storeOptions" />
</template>
```

### User Identity

Set user information for presence display:

```vue
<script setup lang="ts">
const user = {
  userId: "user-123",
  name: "Alice",
  color: "#3b82f6",
  avatar: "https://example.com/alice.jpg",
};
</script>

<template>
  <WovenCanvas :editor="{ user }" :store="storeOptions" />
</template>
```

Random values are generated if not provided.

### WebSocket Options

```typescript
const storeOptions = {
  websocket: {
    url: "wss://your-server.com/sync",
    documentId: "my-document",
    clientId: crypto.randomUUID(),
    token: "auth-token", // optional auth token
    startOffline: false, // start disconnected
    onConnectivityChange: (online: boolean) => {
      console.log(online ? "Connected" : "Disconnected");
    },
    onVersionMismatch: (serverVersion: number) => {
      console.log("Protocol version mismatch");
    },
  },
};
```

## Sync Behaviors

Components specify how their data synchronizes:

| Behavior    | Persisted | Synced | Use Case                   |
| ----------- | --------- | ------ | -------------------------- |
| `document`  | Yes       | Yes    | Document content (default) |
| `ephemeral` | No        | Yes    | Cursor position, presence  |
| `local`     | Yes       | No     | User preferences           |
| `none`      | No        | No     | Temporary UI state         |

Set sync behavior when [defining components](/learn/creating-plugins/#defining-components).

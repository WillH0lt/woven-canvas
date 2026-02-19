---
title: Collaboration
description: Real-time multiplayer and presence awareness
---

Woven Canvas supports real-time collaboration out of the box. Multiple users can edit the same canvas simultaneously with automatic conflict resolution and presence awareness.

## Quick Setup

Connect to a sync server:

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";

const storeOptions = {
  persistence: {
    documentId: "shared-canvas",
  },
  websocket: {
    url: "wss://your-server.com/sync",
    documentId: "shared-canvas",
  },
};
</script>

<template>
  <WovenCanvas :store="storeOptions" />
</template>
```

## User Identity

Pass user data to identify participants:

```vue
<script setup lang="ts">
const user = {
  userId: "user-123", // Stable user ID
  name: "Alice", // Display name
  color: "#3b82f6", // Cursor/selection color
  avatar: "https://...", // Avatar URL
};
</script>

<template>
  <WovenCanvas :editor="{ user }" :store="storeOptions" />
</template>
```

If not provided, random values are generated.

## Presence Awareness

Users automatically see:

- **Cursors** — Other users' cursor positions in real-time
- **Selections** — What other users have selected (shown with their color)
- **Avatars** — Connected users displayed in the corner

### Customizing Presence UI

Replace the user presence display:

```vue
<template>
  <WovenCanvas>
    <template #user-presence="{ users }">
      <div class="my-avatars">
        <div v-for="user in users" :key="user.sessionId">
          <img :src="user.avatar" :alt="user.name" />
          <span>{{ user.name }}</span>
        </div>
      </div>
    </template>
  </WovenCanvas>
</template>
```

Replace cursor rendering:

```vue
<template>
  <WovenCanvas>
    <template #user-cursors="{ users, currentSessionId, camera }">
      <div
        v-for="user in users"
        :key="user.sessionId"
        v-show="user.sessionId !== currentSessionId"
        :style="{
          position: 'absolute',
          left: `${(user.cursorX - camera.left) * camera.zoom}px`,
          top: `${(user.cursorY - camera.top) * camera.zoom}px`,
        }"
      >
        <CursorIcon :color="user.color" />
        <span>{{ user.name }}</span>
      </div>
    </template>
  </WovenCanvas>
</template>
```

## Selection Highlighting

When another user selects a block, it's highlighted with their color. This uses the `held` property in block data:

```vue
<template #block:my-block="{ entityId, block, held }">
  <div
    :style="{
      outline: held?.sessionId ? `2px solid ${getUserColor(held.sessionId)}` : 'none',
    }"
  >
    <!-- block content -->
  </div>
</template>
```

## Conflict Resolution

Woven Canvas uses last-write-wins conflict resolution. When two users edit the same property simultaneously:

1. Both changes are applied locally immediately
2. Changes are sent to the server
3. The server broadcasts the final state
4. All clients converge to the same state

For most canvas operations (moving blocks, changing colors), this works intuitively.

## Offline Support

The canvas works offline by default:

1. Changes are saved locally to IndexedDB
2. When offline, users can continue editing
3. When reconnected, changes sync automatically
4. Conflicts are resolved using last-write-wins

Monitor connection status:

```vue
<template>
  <WovenCanvas :store="storeOptions">
    <template #offline-indicator="{ isOnline }">
      <div v-if="!isOnline" class="offline-banner">Working offline</div>
    </template>
  </WovenCanvas>
</template>
```

## WebSocket Options

```typescript
const syncOptions = {
  websocket: {
    url: "wss://your-server.com/sync",
    documentId: "my-document",
    onConnectivityChange: (online: boolean) => {
      console.log("Connection:", online ? "online" : "offline");
    },
    onVersionMismatch: (serverVersion: number) => {
      console.log("Protocol version mismatch");
    },
  },
};
```

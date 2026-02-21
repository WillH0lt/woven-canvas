---
title: User Interface
description: Toolbar, floating menu, and other UI elements
---

Woven Canvas provides a complete UI out of the box — toolbar, floating menu, user presence, and more. Every part can be customized or replaced using slots.

## UI Overview

```
┌─────────────────────────────────────────────────────────────┐
│[Back to Content]         [Offline Indicator] [User Presence]│
│                                                             │
│                                                             │
│                        ┌───────────────┐                    │
│      ^                 │ Floating Menu │                    │
│   cursors              └───────────────┘                    │
│                        ┌───────────────┐                    │
│                        │   Selection   │                    │
│                        │               │                    │
│                        └───────────────┘                    │
│                                                             │
│          ┌──────────────────────────────────────┐           │
│          │               Toolbar                │           │
│          └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Customizing the Toolbar

Replace the entire toolbar with your own:

```vue
<script setup lang="ts">
import {
  WovenCanvas,
  SelectTool,
  HandTool,
  ShapeTool,
  Toolbar,
} from "@woven-canvas/vue";
</script>

<template>
  <WovenCanvas>
    <template #toolbar>
      <Toolbar>
        <SelectTool />
        <HandTool />
        <ShapeTool />
        <MyCustomTool />
      </Toolbar>
    </template>
  </WovenCanvas>
</template>
```

### Built-in Tool Components

Import and use them directly:

```typescript
import {
  SelectTool,
  HandTool,
  ShapeTool,
  TextTool,
  StickyNoteTool,
  ImageTool,
  PenTool,
  EraserTool,
  ElbowArrowTool,
} from "@woven-canvas/vue";
```

## Floating Menu

When blocks are selected, the menu computes **common components** across all selected blocks. It shows buttons for each common component (e.g., `color`, `text`, `shape`) and positions itself above the selection bounds. The menu hides during drag operations.

### Customizing the Floating Menu

Add buttons for your components:

```vue
<template>
  <WovenCanvas>
    <template #floating-menu>
      <FloatingMenuBar>
        <!-- Add a button for your custom component -->
        <template #button:task-data="{ entityIds }">
          <TaskPriorityButton :entity-ids="entityIds" />
        </template>
      </FloatingMenuBar>
    </template>
  </WovenCanvas>
</template>
```

Override built-in buttons:

```vue
<template>
  <FloatingMenuBar>
    <!-- Replace the color button -->
    <template #button:color="{ entityIds }">
      <MyColorButton :entity-ids="entityIds" />
    </template>

    <!-- Hide shape buttons -->
    <template #button:shape />
  </FloatingMenuBar>
</template>
```

### Built-in Menu Buttons

| Slot                    | Components   | Description                    |
| ----------------------- | ------------ | ------------------------------ |
| `button:color`          | `color`      | Fill color picker              |
| `button:shape`          | `shape`      | Shape kind, fill, stroke       |
| `button:text`           | `text`       | Font, size, bold, italic, etc. |
| `button:penStroke`      | `penStroke`  | Stroke thickness               |
| `button:arrowThickness` | `elbowArrow` | Line thickness                 |
| `button:arrowHeadStart` | `elbowArrow` | Start arrow style              |
| `button:arrowHeadEnd`   | `elbowArrow` | End arrow style                |

## User Presence

Shows avatars of connected users in multiplayer mode.

```vue
<template>
  <WovenCanvas>
    <template #user-presence="{ users }">
      <div class="my-presence">
        <img
          v-for="user in users"
          :key="user.sessionId"
          :src="user.avatar"
          :style="{ borderColor: user.color }"
        />
      </div>
    </template>
  </WovenCanvas>
</template>
```

## User Cursors

Shows other users' cursor positions in real-time. The slot provides camera data for positioning:

```vue
<template>
  <WovenCanvas>
    <template #user-cursors="{ users, currentSessionId, camera }">
      <div
        v-for="u in users"
        :key="u.sessionId"
        v-show="u.sessionId !== currentSessionId"
        :style="{
          position: 'absolute',
          left: `${(u.cursorX - camera.left) * camera.zoom}px`,
          top: `${(u.cursorY - camera.top) * camera.zoom}px`,
        }"
      >
        <MyCursorIcon :color="u.color" :name="u.name" />
      </div>
    </template>
  </WovenCanvas>
</template>
```

## Background

Choose between grid, dots, or a custom background:

```vue
<template>
  <!-- Grid background -->
  <WovenCanvas :background="{ kind: 'grid' }" />

  <!-- Dots background -->
  <WovenCanvas :background="{ kind: 'dots' }" />

  <!-- Custom background -->
  <WovenCanvas>
    <template #background>
      <div class="my-background" />
    </template>
  </WovenCanvas>
</template>
```

## Other UI Slots

| Slot                | Props                 | Description                   |
| ------------------- | --------------------- | ----------------------------- |
| `loading`           | `{ isLoading }`       | Loading overlay               |
| `offline-indicator` | `{ isOnline }`        | Offline status banner         |
| `version-mismatch`  | `{ versionMismatch }` | Protocol version warning      |
| `back-to-content`   | —                     | Button to pan back to content |

Example:

```vue
<template>
  <WovenCanvas>
    <template #offline-indicator="{ isOnline }">
      <div v-if="!isOnline" class="offline-banner">Working offline</div>
    </template>

    <template #loading="{ isLoading }">
      <div v-if="isLoading" class="custom-loader">Loading...</div>
    </template>
  </WovenCanvas>
</template>
```

## Theme

Woven Canvas uses CSS custom properties for styling. Override them to match your design:

```css
.wov-root {
  --wov-primary: #3b82f6;
  --wov-primary-light: #60a5fa;
  --wov-gray-100: #f3f4f6;
  --wov-gray-600: #4b5563;
  --wov-gray-700: #374151;
  --wov-menu-border-radius: 8px;
}
```

See [theme.css](https://github.com/WillH0lt/woven-canvas/blob/main/packages/vue/src/theme.css) for the full list of variables.

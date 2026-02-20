---
title: Tools
description: How toolbar tools work in Woven Canvas
---

Tools are the buttons in the toolbar that control how users interact with the canvas. When a tool is active, it determines what happens when users click, drag, or interact with the canvas.

## Built-in Tools

Woven Canvas includes these tools:

| Tool          | Description                             |
| ------------- | --------------------------------------- |
| `select`      | Select, move, resize, and rotate blocks |
| `hand`        | Pan the canvas by dragging              |
| `shape`       | Create shape blocks                     |
| `text`        | Create text blocks                      |
| `sticky-note` | Create sticky notes                     |
| `image`       | Upload and place images                 |
| `pen`         | Freehand drawing                        |
| `eraser`      | Erase pen strokes                       |
| `elbow-arrow` | Create right-angle arrow connectors     |

## Active Tool State

Only one tool can be active at a time. Use the `useToolbar` composable to check or change the active tool:

```typescript
import { useToolbar } from "@woven-canvas/vue";

const { activeTool } = useToolbar();

// Check the current tool
console.log("Active tool:", activeTool.value);

// Change the active tool
activeTool.value = "hand";

// React to tool changes
watch(activeTool, (newTool, oldTool) => {
  console.log(`Switched from ${oldTool} to ${newTool}`);
});
```

## How Tools Create Blocks

Most tools create blocks in one of two ways:

### Click to Place

When a tool is active and the user clicks on the canvas, a new block is created at that position. The tool defines the initial state via a **placement snapshot**.

### Drag to Create

Users can drag directly from a toolbar button onto the canvas. This creates a block and immediately starts dragging it. The tool defines the initial state via a **drag-out snapshot**.

## Tool Components

Tools are Vue components that use `ToolbarButton`:

```vue
<script setup lang="ts">
import { ToolbarButton } from "@woven-canvas/vue";

const snapshot = JSON.stringify({
  block: {
    tag: "my-block",
    size: [200, 100],
  },
});
</script>

<template>
  <ToolbarButton
    name="my-tool"
    tooltip="My Tool"
    :placement-snapshot="snapshot"
    :drag-out-snapshot="snapshot"
  >
    <svg><!-- icon --></svg>
  </ToolbarButton>
</template>
```

### ToolbarButton Props

| Prop                | Type     | Description                      |
| ------------------- | -------- | -------------------------------- |
| `name`              | `string` | Unique tool identifier           |
| `tooltip`           | `string` | Tooltip shown on hover           |
| `placementSnapshot` | `string` | JSON for click-to-place blocks   |
| `dragOutSnapshot`   | `string` | JSON for drag-to-create blocks   |
| `cursor`            | `string` | Cursor namne when tool is active |

## Snapshots

A snapshot defines the initial state for new blocks. It's a JSON object where keys are component names:

```typescript
const snapshot = JSON.stringify({
  // Required: Block component
  // Note: position and rank are set automatically, so we only need tag and size
  block: {
    tag: "color-card",
    size: [200, 120],
  },

  color: {
    red: 255,
    green: 200,
    blue: 100,
    alpha: 255,
  },
});
```

## Cursors

Tools can specify a cursor that appears when the tool is active:

```vue
<script setup lang="ts">
import { ToolbarButton, CursorKind } from "@woven-canvas/vue";
</script>

<template>
  <ToolbarButton
    name="crosshair-tool"
    :cursor="CursorKind.Crosshair"
    :placement-snapshot="snapshot"
  >
    <!-- icon -->
  </ToolbarButton>
</template>
```

Built-in cursor kinds:

| Cursor                 | Description                     |
| ---------------------- | ------------------------------- |
| `CursorKind.Select`    | Selection arrow cursor          |
| `CursorKind.Hand`      | Open hand for panning           |
| `CursorKind.Crosshair` | Crosshair for precise placement |

To register custom SVG cursors, see [Defining Cursors](/learn/plugins/#defining-cursors).

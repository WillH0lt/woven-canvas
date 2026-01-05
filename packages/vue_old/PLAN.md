# @infinitecanvas/vue MVP Plan

## Goal

Render infinite canvas blocks in Vue with a simple, declarative API.

## Target API

```vue
<script setup>
import { InfiniteCanvas } from "@infinitecanvas/vue";
</script>

<template>
  <InfiniteCanvas @ready="(editor) => console.log(editor)">
    <!-- Slot name matches block tag -->
    <!-- Props are defined by the BlockDef's components map -->
    <template #rect="{ block }">
      <div class="rect" :style="{ background: 'blue' }" />
    </template>

    <template #arrow="{ block, arrow, color }">
      <ArrowRenderer :arrow="arrow" :color="color.value" />
    </template>

    <template #image="{ block, image }">
      <img :src="image.url" :style="{ width: '100%', height: '100%' }" />
    </template>
  </InfiniteCanvas>
</template>
```

## Architecture

```
@infinitecanvas/vue
├── Editor.ts              (existing - low-level editor wrapper)
└── InfiniteCanvas.vue     (new - high-level canvas with block rendering)
    ├── imports InfiniteCanvasPlugin from @infinitecanvas/plugin-selection
    ├── imports CanvasControlsPlugin from @infinitecanvas/plugin-canvas-controls
    ├── subscribes to Block query
    ├── renders blocks with camera transform
    └── exposes slots for custom block rendering
```

## InfiniteCanvas Component

### Props

| Prop       | Type                  | Default | Description                                               |
| ---------- | --------------------- | ------- | --------------------------------------------------------- |
| `controls` | `ControlsOptions`     | `{}`    | Options for CanvasControlsPlugin (minZoom, maxZoom, etc.) |
| `plugins`  | `EditorPluginInput[]` | `[]`    | Additional plugins to load                                |

### Events

| Event   | Payload  | Description                      |
| ------- | -------- | -------------------------------- |
| `ready` | `Editor` | Fired when editor is initialized |

### Slots

Slot names match block tags. Props are defined by each BlockDef's `components` map.

| Slot      | Description                                               |
| --------- | --------------------------------------------------------- |
| `#${tag}` | Render block with matching tag. Props come from BlockDef. |

### BlockDef System

Plugins define BlockDefs that declare:

1. The block tag (slot name)
2. Which components to pass as slot props

```ts
// In plugin-arrows
import { defineBlockDef } from "@infinitecanvas/editor";

export const ArrowBlockDef = defineBlockDef({
  tag: "arrow",
  components: {
    block: Block, // Always included (required)
    arrow: Arrow, // Plugin-specific component
    color: Color, // Optional component
  },
});

// Register in plugin
export const ArrowsPlugin: EditorPlugin = {
  name: "arrows",
  blockDefs: [ArrowBlockDef],
  components: [Arrow, Color],
  // ...
};
```

The slot receives typed props based on the BlockDef:

```ts
// Auto-generated from ArrowBlockDef.components
interface ArrowSlotProps {
  block: {
    tag: string;
    position: [number, number];
    size: [number, number];
    rotateZ: number;
    rank: string;
  };
  arrow: {
    start: [number, number];
    end: [number, number];
    arrowHeadStyle: string;
  };
  color: { value: string };
}
```

### How Rendering Works

1. `<InfiniteCanvas>` collects all `blockDefs` from loaded plugins
2. Subscribes to Block query for all entities
3. For each entity, looks up BlockDef by `block.tag`
4. Reads all components declared in BlockDef
5. Passes them as props to the matching slot

## Implementation Steps

1. Add plugin dependencies to package.json
2. Create InfiniteCanvas.vue component
   - Mount Editor with InfiniteCanvasPlugin + CanvasControlsPlugin
   - Subscribe to Block query for reactive updates
   - Subscribe to Camera for transform calculations
   - Render positioned block containers
   - Forward slots for custom block content
3. Export from index.ts
4. Test with examples/editor-vue

## Key Decisions

- **Block positioning**: InfiniteCanvas handles all transform math (camera offset, zoom, rotation). Slot content just fills the container.
- **Reactivity**: Use `editor.subscribe()` to sync ECS state to Vue refs (coming later)
- **Default rendering**: If no slot matches, render nothing.

## Out of Scope (for MVP)

- Two-way sync (v-model:blocks)
- Custom camera controls
- Multi-select rendering
- Transform handles UI (handled by plugin internally?)

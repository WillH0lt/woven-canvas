---
title: The Editor
description: Working with the Editor runtime
---

The `Editor` class is the runtime that ties everything together. It manages the ECS world, runs the tick loop, and coordinates plugins. When you use the `WovenCanvas` component, it creates an Editor instance internally.

## Accessing the Editor

Inside components rendered within `WovenCanvas`, use the `useEditorContext` composable:

```typescript
import { useEditorContext } from "@woven-canvas/vue";

const { getEditor, nextEditorTick } = useEditorContext();

// Get the editor instance (may be null during initialization)
const editor = getEditor();

// Execute code in the next ECS tick
nextEditorTick((ctx) => {
  // ctx is the ECS context for reading/writing data
});
```

You can also access the editor via the `ready` event:

```vue
<script setup lang="ts">
import { WovenCanvas, type Editor } from "@woven-canvas/vue";

function onReady(editor: Editor) {
  console.log("Editor ready:", editor);
}
</script>

<template>
  <WovenCanvas @ready="onReady" />
</template>
```

## Reading and Writing Data

All state lives in the ECS. Use the context to read and write:

```typescript
import { Block, Color } from "@woven-canvas/core";

nextEditorTick((ctx) => {
  // Read component data (immutable)
  const block = Block.read(ctx, entityId);
  console.log("Position:", block.position);

  // Write component data (mutable)
  const color = Color.write(ctx, entityId);
  color.red = 255;
  color.green = 0;
  color.blue = 0;
});
```

Changes made during a tick are automatically tracked for:

- Undo/redo history
- Network synchronization
- Persistence

## Reactive Subscriptions

Vue composables provide reactive access to ECS data:

```typescript
import { useComponent, useSingleton, useQuery } from "@woven-canvas/vue";
import { Block, Camera } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Subscribe to a component on a specific entity
const block = useComponent(entityId, Block);

// Subscribe to a singleton (global state)
const camera = useSingleton(Camera);

// Subscribe to a query (multiple entities)
const selectedBlocks = useQuery([Block, Selected]);
```

These composables return Vue refs that update automatically when the underlying data changes.

## Commands

Commands are the primary way to trigger actions from user input.

```typescript
import { useEditorContext } from "@woven-canvas/vue";
import { Undo } from "@woven-canvas/core";
import { DeselectAll } from "@woven-canvas/plugin-selection";

const { nextEditorTick } = useEditorContext();

nextEditorTick((ctx) => {
  // Undo the last action
  Undo.spawn(ctx);

  // Deselect all blocks
  DeselectAll.spawn(ctx);
});
```

For convenience, you can also dispatch commands directly on the editor:

```typescript
import { useEditorContext } from "@woven-canvas/vue";
import { Undo } from "@woven-canvas/core";
import { DeselectAll } from "@woven-canvas/plugin-selection";

const { getEditor } = useEditorContext();

const editor = getEditor();
editor?.command(Undo);
editor?.command(DeselectAll);
```

## Configuration

The editor accepts configuration via props on `WovenCanvas`:

```vue
<template>
  <WovenCanvas
    :editor="{
      maxEntities: 10000,
      grid: { enabled: true, colWidth: 20, rowHeight: 20 },
      plugins: [MyPlugin],
    }"
    :plugin-options="{
      controls: { minZoom: 0.1, maxZoom: 10 },
    }"
  />
</template>
```

You can also disable built-in plugins by passing `false`:

```vue
<template>
  <WovenCanvas
    :plugin-options="{
      pen: false,
      eraser: false,
    }"
  />
</template>
```

See the [WovenCanvas API reference](/reference/woven-canvas/) for all available props.

# InfiniteCanvas Vue Component - Dynamic Slot Props Plan

## Goal

Enable users to receive component data in slots based on the BlockDef's registered components:

```vue
<InfiniteCanvas :editor="editor">
  <template #rect="{ block, rect }">
    <!-- block: Block component data -->
    <!-- rect: Rect component data (custom) -->
    <div :style="{ background: uint32ToHex(rect.color) }">
      Rectangle
    </div>
  </template>
</InfiniteCanvas>
```

## How It Works

1. **BlockDef defines which components a block type has:**

   ```ts
   const RectBlockDef: BlockDefInput = {
     tag: "rect",
     components: [Rect], // Custom components for this block type
   };
   ```

2. **InfiniteCanvas reads BlockDefs from editor:**

   ```ts
   const blockDefs = props.editor.blockDefs;
   // { rect: { tag: 'rect', components: [Rect], ... } }
   ```

3. **When rendering a block, look up its BlockDef by tag:**

   ```ts
   const blockDef = blockDefs[block.tag];
   // blockDef.components = [Rect]
   ```

4. **Read each component and pass to slot:**
   ```ts
   const slotProps = {
     block: Block.snapshot(ctx, entityId),
     // Dynamic: read each component from blockDef.components
     rect: Rect.snapshot(ctx, entityId), // keyed by component name
   };
   ```

## Implementation Steps

### Step 1: Create Rect Component in editor-vue

Create a custom `Rect` component in the editor-vue example:

**File: `examples/editor-vue/src/RectPlugin.ts`**

```ts
import {
  defineEditorComponent,
  field,
  createEntity,
  addComponent,
  Block,
  Synced,
  type EditorPlugin,
  type Context,
} from "@infinitecanvas/editor";
import { generateKeyBetween } from "fractional-indexing-jittered";

// Define the Rect component schema
export const Rect = defineEditorComponent(
  "rect",
  {
    color: field.uint32().default(0x4a90d9ff),
  },
  { sync: "document" }
);

// Define the block def for rect blocks
export const RectBlockDef = {
  tag: "rect",
  components: [Rect],
};

// Plugin that registers the Rect component and block def
export const RectPlugin: EditorPlugin = {
  name: "rect",
  components: [Rect],
  blockDefs: {
    rect: RectBlockDef,
  },
};

// Helper to create rect blocks
export function createRectBlock(
  ctx: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = 0x4a90d9ff
): number {
  const entityId = createEntity(ctx);

  addComponent(ctx, entityId, Synced, { id: crypto.randomUUID() });
  addComponent(ctx, entityId, Block, {
    tag: "rect",
    position: [x, y],
    size: [width, height],
    rank: generateKeyBetween(null, null),
  });
  addComponent(ctx, entityId, Rect, { color });

  return entityId;
}
```

### Step 2: Update InfiniteCanvas to Read BlockDef Components

**File: `packages/vue/src/components/InfiniteCanvas.vue`**

```ts
import { shallowRef } from "vue";
import {
  Editor,
  Camera,
  defineQuery,
  hasComponent,
  Block,
  type EntityId,
} from "@infinitecanvas/editor";

const blockQuery = defineQuery((q) => q.with(Block));

const props = defineProps<{
  editor: Editor;
}>();

const blocksRef = shallowRef<Array<{ _key: EntityId; [key: string]: unknown }>>(
  []
);
const cameraRef = shallowRef({ left: 0, top: 0, zoom: 1 });

function updateBlocks() {
  const ctx = props.editor._getContext();
  const blockDefs = props.editor.blockDefs;
  const blocks: Array<{ _key: EntityId; [key: string]: unknown }> = [];

  for (const entityId of blockQuery.current(ctx)) {
    const blockData = Block.read(ctx, entityId);
    const blockDef = blockDefs[blockData.tag];

    // Build slot props starting with Block data
    const slotProps: Record<string, unknown> = {
      _key: entityId, // Internal key for v-for, not exposed to user
      block: {
        tag: blockData.tag,
        position: [...blockData.position] as [number, number],
        size: [...blockData.size] as [number, number],
        rotateZ: blockData.rotateZ,
        rank: blockData.rank,
      },
    };

    // Add each BlockDef component's data
    if (blockDef?.components) {
      for (const componentDef of blockDef.components) {
        if (hasComponent(ctx, entityId, componentDef)) {
          // Key by component name (lowercase)
          const key = componentDef.name.toLowerCase();
          slotProps[key] = componentDef.snapshot(ctx, entityId);
        }
      }
    }

    blocks.push(slotProps as { _key: EntityId; [key: string]: unknown });
  }

  // Sort by rank for z-ordering
  blocks.sort((a, b) => {
    const aRank = (a.block as { rank: string }).rank;
    const bRank = (b.block as { rank: string }).rank;
    return aRank > bRank ? 1 : -1;
  });

  blocksRef.value = blocks;
}
```

Template:

```vue
<template>
  <div
    class="infinite-canvas"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'none',
    }"
  >
    <div
      v-for="slotProps in blocksRef"
      :key="slotProps._key"
      class="infinite-canvas-block"
      :style="getBlockStyle(slotProps.block)"
    >
      <slot :name="slotProps.block.tag" v-bind="slotProps" />
    </div>
  </div>
</template>
```

### Step 3: Update editor-vue Example

**File: `examples/editor-vue/src/App.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Editor } from "@infinitecanvas/editor";
import { Store } from "@infinitecanvas/store";
import { CanvasControlsPlugin } from "@infinitecanvas/plugin-canvas-controls";
import { SelectionPlugin } from "@infinitecanvas/plugin-selection";
import { InfiniteCanvas } from "@infinitecanvas/vue";
import { RectPlugin, createRectBlock } from "./RectPlugin";

const containerRef = ref<HTMLDivElement | null>(null);
const editorRef = shallowRef<Editor | null>(null);
let store: Store | null = null;
let animationFrameId: number | null = null;

function uint32ToHex(color: number): string {
  return "#" + color.toString(16).padStart(8, "0").slice(0, 6);
}

function loop() {
  editorRef.value?.tick();
  animationFrameId = requestAnimationFrame(loop);
}

onMounted(async () => {
  if (!containerRef.value) return;

  store = new Store({
    documentId: "editor-vue-demo",
    useLocalPersistence: true,
  });

  const editor = new Editor(containerRef.value, {
    store,
    plugins: [
      CanvasControlsPlugin({ minZoom: 0.1, maxZoom: 10 }),
      SelectionPlugin,
      RectPlugin,
    ],
  });

  await editor.initialize();
  editorRef.value = editor;

  animationFrameId = requestAnimationFrame(loop);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  editorRef.value?.dispose();
  store?.dispose();
});

function addRect() {
  editorRef.value?.nextTick((ctx) => {
    createRectBlock(ctx, 100, 100, 200, 150, 0x4a90d9ff);
  });
}
</script>

<template>
  <div class="editor" ref="containerRef">
    <div class="toolbar">
      <button @click="addRect">Add Rect</button>
    </div>
    <InfiniteCanvas v-if="editorRef" ref="canvasRef" :editor="editorRef">
      <template #rect="{ block, rect }">
        <div
          class="rect-block"
          :style="{
            width: '100%',
            height: '100%',
            background: uint32ToHex(rect.color),
            borderRadius: '4px',
          }"
        />
      </template>
    </InfiniteCanvas>
  </div>
</template>
```

## File Changes Summary

| File                                             | Change                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `examples/editor-vue/src/RectPlugin.ts`          | NEW - Rect component, BlockDef, plugin, createRectBlock helper    |
| `packages/vue/src/components/InfiniteCanvas.vue` | Update `updateBlocks()` to read BlockDef components dynamically   |
| `examples/editor-vue/src/App.vue`                | Use RectPlugin, access `rect` in slot, add button to create rects |

## Notes

- `entityId` is used internally as `_key` for Vue's `v-for` but not exposed to users
- Slot props are `{ block, ...componentData }` where component data is keyed by component name
- No separate `BlockSlotProps` type needed - it's just `block` + whatever components the BlockDef defines
- `selected`, `hovered`, `editing` removed for MVP simplicity

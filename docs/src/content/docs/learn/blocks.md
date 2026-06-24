---
title: Blocks
description: The visual elements on your canvas
---

Blocks are the visual elements on your canvas — shapes, text, images, sticky notes, and anything else you can see. Every block is an ECS entity with a `Block` component that stores its core properties.

## Block Properties

The `Block` component contains:

```typescript
interface Block {
  tag: string; // Block type identifier
  position: [number, number]; // [x, y] in world coordinates
  size: [number, number]; // [width, height] in pixels
  rank: string; // Z-order (fractional indexing)
  rotateZ: number; // Rotation in radians
  flip: [boolean, boolean]; // [flipX, flipY] for mirroring
  layerId: number | null; // Layer membership (null = unlayered)
}
```

## Built-in Block Types

Woven Canvas includes the following block types:

| Tag           | Description            | Components                         |
| ------------- | ---------------------- | ---------------------------------- |
| `sticky-note` | Colored sticky notes   | `Block`, `Color`, `Text`           |
| `text`        | Rich text blocks       | `Block`, `Text`                    |
| `shape`       | Geometric shapes       | `Block`, `Shape`, `Text`           |
| `image`       | Images                 | `Block`, `Image`, `Asset`          |
| `pen-stroke`  | Freehand drawings      | `Block`, `PenStroke`, `Color`      |
| `elbow-arrow` | Right-angle connectors | `Block`, `ElbowArrow`, `Connector` |

## How Blocks Render

The `WovenCanvas` component renders blocks using **named slots**. For each block, it looks for a slot named `block:<tag>`:

```vue
<template>
  <WovenCanvas>
    <!-- Override how sticky notes render -->
    <template #block:sticky-note="props">
      <MyStickyNote v-bind="props" />
    </template>

    <!-- Add a new block type -->
    <template #block:my-block="props">
      <MyBlock v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

The slot receives a `BlockData` object in `props`:

```typescript
interface BlockData {
  entityId: number; // The entity ID
  block: Block; // Block component data
  stratum: Stratum; // Render layer
  selected: boolean; // Is selected?
  hovered: boolean; // Is mouse over?
  edited: boolean; // Is being edited?
  held: HeldData; // Who is dragging this?
  opacity: number; // Current opacity
}
```

## Reading Block Data

Use `useComponent` to reactively read block data:

```typescript
import { useComponent } from "@woven-canvas/vue";
import { Block, Color, Text } from "@woven-canvas/core";

const props = defineProps<{ entityId: number }>();

const block = useComponent(props.entityId, Block);
const color = useComponent(props.entityId, Color);
const text = useComponent(props.entityId, Text);

// React to changes
watchEffect(() => {
  console.log("Position:", block.value?.position);
  console.log(
    "Color:",
    color.value?.red,
    color.value?.green,
    color.value?.blue,
  );
});
```

## Writing Block Data

Use `nextEditorTick` to modify blocks, this ensures your changes are applied at the start of the next editor tick. It's important to use `nextEditorTick` to apply updates, otherwise the update may be applied mid-frame, potentially causing visual glitches and inconsistent state.

```typescript
import { useEditorContext } from "@woven-canvas/vue";
import { Block, Color } from "@woven-canvas/core";

const { nextEditorTick } = useEditorContext();

function moveBlock(entityId: number, dx: number, dy: number) {
  nextEditorTick((ctx) => {
    const block = Block.write(ctx, entityId);
    block.position[0] += dx;
    block.position[1] += dy;
  });
}

function setColor(entityId: number, r: number, g: number, b: number) {
  nextEditorTick((ctx) => {
    const color = Color.write(ctx, entityId);
    color.red = r;
    color.green = g;
    color.blue = b;
  });
}
```

## Querying Blocks

Use `useQuery` to find blocks matching criteria:

```typescript
import { useQuery } from "@woven-canvas/vue";
import { Block, Selected } from "@woven-canvas/core";

// All blocks
const allBlocks = useQuery([Block]);

// Selected blocks only
const selectedBlocks = useQuery([Block, Selected]);

// React to selection changes
watchEffect(() => {
  console.log("Selected count:", selectedBlocks.value.length);
});
```

## Strata

Blocks are rendered in three strata:

| Stratum      | Purpose                |
| ------------ | ---------------------- |
| `background` | Background elements    |
| `content`    | Main content (default) |
| `overlay`    | Selection UI, handles  |

Within each stratum, blocks are sorted by their `rank` property.

## Layers

Layers can be useful if you're building a design app.

Layers are named z-order bands within a page that let you group blocks and
control how they stack, independently of each block's own `rank`. A block joins
a layer through its `layerId` (`null` means it's unlayered).

Each `Layer` is its own ECS entity with these properties:

| Property | Description                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| `label`  | Display name shown in the layers panel                                        |
| `rank`   | Z-order among the page's layers (fractional indexing) — higher sorts in front |
| `locked` | When `true`, blocks in the layer can't be selected or hovered                 |
| `hidden` | When `true`, the layer isn't rendered and is skipped by hit-testing           |

A block's effective stacking order is `(stratum, layer rank, block rank)`

## Creating Blocks

Toolbar tools place blocks for you from a [snapshot](/learn/tools/#snapshots). When a plugin needs to create a block from its **own** system, use `createBlock`:

```typescript
import {
  addComponent,
  createBlock,
  defineEditorSystem,
} from "@woven-canvas/core";

const spawnPotionSystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  for (const cmd of SpawnPotion.consume(ctx)) {
    const entityId = createBlock(ctx, {
      tag: "potion-card",
      position: cmd.point, // top-left, in world coordinates
      size: [200, 120],
    });

    // Add any extra components as usual.
    addComponent(ctx, entityId, Potion, { name: "Health" });
  }
});
```

`createBlock` handles the boilerplate that's easy to forget:

- assigns a `Synced` id so the block persists and syncs in multiplayer,
- gives it a top-of-stack `rank` (z-order),
- adds the `Block` component, and
- **places** the block: parents it to the frame (a page, group, …) under its `position`, and lets other plugins attach per-block state.

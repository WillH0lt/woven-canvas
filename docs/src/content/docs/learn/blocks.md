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

## Strata (Layers)

Blocks are rendered in three layers:

| Stratum      | Purpose                |
| ------------ | ---------------------- |
| `background` | Background elements    |
| `content`    | Main content (default) |
| `overlay`    | Selection UI, handles  |

Within each stratum, blocks are sorted by their `rank` property.

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
  console.log("Color:", color.value?.red, color.value?.green, color.value?.blue);
});
```

## Writing Block Data

Use `nextEditorTick` to modify blocks, this ensures your changes are applied at the start of the next editor tick, in sync with other editor updates:

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
import { Block } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// All blocks
const allBlocks = useQuery([Block]);

// Selected blocks only
const selectedBlocks = useQuery([Block, Selected]);

// React to selection changes
watchEffect(() => {
  console.log("Selected count:", selectedBlocks.value.length);
});
```

See the [Custom Block example](/examples/custom-block/) for a complete walkthrough.

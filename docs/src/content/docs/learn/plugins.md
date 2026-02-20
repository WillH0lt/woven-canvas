---
title: Plugins
slug: learn/plugins
description: Package your customizations into reusable plugins
---

Create a plugin when you need to:

- Add custom ECS components with specific data types
- Run systems that execute logic every frame
- Define new block types with custom behavior
- Package functionality for reuse across projects

For a deep dive into the Entity Component System architecture, see the [woven-ecs documentation](https://woven-ecs.dev).

## Plugin Structure

A plugin is an object that implements the `EditorPlugin` interface:

```typescript
import type { EditorPlugin } from "@woven-canvas/core";

export function PotionPlugin(options = {}): EditorPlugin {
  return {
    name: "potions",

    // ECS components to register
    components: [],

    // Singleton components (one per world)
    singletons: [],

    // Block type definitions
    blockDefs: [],

    // Systems that run each frame
    systems: [],

    // Keyboard shortcut bindings
    keybinds: [],

    // Custom cursor definitions
    cursors: {},

    // Plugin configuration (accessible at runtime)
    resources: {},

    // Plugin dependencies
    dependencies: [],
  };
}
```

## Defining Components

Components store data on entities. Use `defineCanvasComponent` to create typed components:

```typescript
import { defineCanvasComponent, field } from "@woven-canvas/core";

export const HslColor = defineCanvasComponent("hsl-color", {
  hue: field.number().default(0),
  saturation: field.number().default(100),
  lightness: field.number().default(50),
});

export const Potion = defineCanvasComponent("potion", {
  name: field.string().default("Mystery Potion"),
  effect: field.string().default(""),
  brewed: field.boolean().default(false),
  potency: field.enum(["weak", "standard", "potent"]).default("standard"),
});
```

### Field Types

| Field Type                     | Description                            |
| ------------------------------ | -------------------------------------- |
| `field.string().max(n)`        | String value (max length required)     |
| `field.boolean()`              | Boolean value                          |
| `field.enum({...})`            | Enumerated string values               |
| `field.ref()`                  | Reference to another entity            |
| `field.array(type, maxLength)` | Fixed-size array                       |
| `field.tuple(type, length)`    | Fixed-size tuple (e.g., coordinates)   |
| `field.buffer(type).size(n)`   | Typed buffer for zero-allocation views |
| `field.binary()`               | Binary data (Uint8Array)               |
| `field.float64()`              | 64-bit floating point                  |
| `field.float32()`              | 32-bit floating point                  |
| `field.uint8()`                | Unsigned 8-bit integer (0-255)         |
| `field.uint16()`               | Unsigned 16-bit integer                |
| `field.uint32()`               | Unsigned 32-bit integer                |
| `field.int8()`                 | Signed 8-bit integer                   |
| `field.int16()`                | Signed 16-bit integer                  |
| `field.int32()`                | Signed 32-bit integer                  |

All field types support `.default(value)` to set a default value.

Components can also specify a `sync` behavior to control how data is persisted and synced in multiplayer. See [Sync Behaviors](/learn/canvas-store/#sync-behaviors) for details.

## Defining Block Definitions

Block definitions configure how blocks behave:

```typescript
blockDefs: [
  {
    tag: "potion-card", // Block type identifier
    resizeMode: "free", // 'free', 'aspectRatio', or 'none'
    canRotate: true, // Allow rotation
    canScale: true, // Allow scaling
    stratum: "content", // 'content' or 'overlay'
    components: [HslColor, Potion], // Additional components for this block type
    connectors: { enabled: true }, // Arrow connection support
  },
];
```

### Block Options

| Option       | Type      | Default             | Description                    |
| ------------ | --------- | ------------------- | ------------------------------ |
| `tag`        | `string`  | required            | Unique block type identifier   |
| `resizeMode` | `string`  | `'free'`            | Resize behavior                |
| `canRotate`  | `boolean` | `true`              | Allow rotation                 |
| `canScale`   | `boolean` | `true`              | Allow scaling                  |
| `stratum`    | `string`  | `'content'`         | Render layer                   |
| `components` | `array`   | `[]`                | Components added to new blocks |
| `connectors` | `object`  | `{ enabled: true }` | Arrow connection config        |

The `Block` component is always included automatically on every block entity.

## Defining Commands

Commands are typed actions that can be dispatched and consumed:

```typescript
import { defineCommand } from "@woven-canvas/core";

// Command with no payload
export const BrewPotion = defineCommand<void>("brew-potion");

// Command with typed payload
export const SetPotency = defineCommand<{
  entityId: number;
  potency: "weak" | "standard" | "potent";
}>("set-potency");
```

## Defining Systems

Systems run each frame to process commands and update state:

```typescript
import { defineEditorSystem, defineQuery } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Query for entities matching criteria
const selectedPotions = defineQuery((q) => q.with(Potion, Selected));

// System that runs in the 'update' phase
const handlePotencySystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  // Consume commands
  for (const cmd of SetPotency.consume(ctx)) {
    const potion = Potion.write(ctx, cmd.entityId);
    potion.potency = cmd.potency;
  }
});
```

### The Tick Loop

The editor runs a continuous loop that processes input and updates state:

```
┌─────────────────────────────────────────┐
│                                         │
│   Input → Capture → Update → Render     │
│     ↑                           │       │
│     └───────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

Each system is assigned a phase, and each phase has a specific purpose:

| Phase     | Description                                                    |
| --------- | -------------------------------------------------------------- |
| `input`   | Convert raw DOM events to ECS state (keyboard, mouse, pointer) |
| `capture` | Detect targets, compute intersections, process keybinds        |
| `update`  | Modify document state, process commands                        |
| `render`  | Sync ECS state to output (DOM, canvas)                         |

## Defining Keybinds

Map keyboard shortcuts to commands:

```typescript
import { Key } from "@woven-canvas/core";

keybinds: [
  {
    command: BrewPotion.name,
    key: Key.Enter,
    mod: true, // Require Ctrl/Cmd
    shift: false, // Require Shift
    alt: false, // Require Alt
  },
];
```

## Defining Cursors

Define custom SVG cursors for your tools:

```typescript
import type { CursorDef } from "@woven-canvas/core";

const POTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">...</svg>`;

const potionCursor: CursorDef = {
  makeSvg: () => POTION_SVG,
  hotspot: [2, 22], // Click point [x, y] in pixels
  rotationOffset: 0, // Base rotation in radians
};

// In plugin definition
cursors: {
  potion: potionCursor,
}
```

Use the cursor name in your toolbar button:

```vue
<ToolbarButton
  name="potion-tool"
  cursor="potion"
  :placement-snapshot="snapshot"
/>
```

## Plugin Resources

Resources store plugin configuration accessible at runtime:

```typescript
import { getPluginResources } from '@woven-canvas/core'

// In plugin definition
resources: {
  defaultPotency: options.defaultPotency ?? 'standard',
  maxPotions: options.maxPotions ?? 100,
}

// Accessing in a system
const mySystem = defineEditorSystem({ phase: 'update' }, (ctx) => {
  const resources = getPluginResources<PotionPluginResources>(ctx, 'potions')
  console.log(resources.defaultPotency)
})
```

## Plugin Dependencies

Declare plugins your plugin depends on:

```typescript
export function PotionPlugin(): EditorPlugin {
  return {
    name: "potions",
    dependencies: ["selection"], // Requires SelectionPlugin
    // ...
  };
}
```

Dependencies are automatically loaded before your plugin.

## Complete Example

Here's a complete plugin that adds potion cards:

```typescript
import type { CursorDef, EditorPlugin } from "@woven-canvas/core";
import {
  defineCanvasComponent,
  defineCommand,
  defineEditorSystem,
  defineQuery,
  field,
  Key,
} from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Components
export const HslColor = defineCanvasComponent("hsl-color", {
  hue: field.number().default(280),
  saturation: field.number().default(80),
  lightness: field.number().default(50),
});

export const Potion = defineCanvasComponent("potion", {
  name: field.string().default("Mystery Potion"),
  brewed: field.boolean().default(false),
});

// Command
export const BrewPotion = defineCommand<void>("brew-potion");

// Query
const selectedPotions = defineQuery((q) => q.with(Potion, Selected));

// System
const brewPotionSystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  for (const _cmd of BrewPotion.consume(ctx)) {
    for (const entityId of selectedPotions.current(ctx)) {
      const potion = Potion.write(ctx, entityId);
      potion.brewed = !potion.brewed;
    }
  }
});

// Cursor
const POTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">...</svg>`;

const potionCursor: CursorDef = {
  makeSvg: () => POTION_SVG,
  hotspot: [12, 20],
  rotationOffset: 0,
};

// Plugin factory
export function PotionPlugin(): EditorPlugin {
  return {
    name: "potions",
    dependencies: ["selection"],
    components: [HslColor, Potion],
    systems: [brewPotionSystem],
    keybinds: [{ command: BrewPotion.name, key: Key.Enter, mod: true }],
    cursors: { potion: potionCursor },
    blockDefs: [
      {
        tag: "potion-card",
        resizeMode: "free",
        canRotate: false,
        components: [HslColor, Potion],
      },
    ],
  };
}
```

## Using Your Plugin

```vue
<script setup lang="ts">
import { WovenCanvas, SelectTool, HandTool } from "@woven-canvas/vue";
import { PotionPlugin } from "./PotionPlugin";
import PotionCard from "./PotionCard.vue";
import PotionTool from "./PotionTool.vue";
</script>

<template>
  <WovenCanvas :editor="{ plugins: [PotionPlugin()] }">
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <HandTool />
        <PotionTool />
      </div>
    </template>
    <template #block:potion-card="props">
      <PotionCard v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

See the [Create a Custom Block](/examples/create-a-custom-block/) and [Create a Plugin](/examples/create-a-plugin/) examples for more practical patterns.

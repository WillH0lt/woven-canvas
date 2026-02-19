---
title: Creating Custom Plugins
description: Package your customizations into reusable plugins
---

Plugins let you bundle components, systems, commands, and keybinds into a reusable package. This guide covers the plugin architecture and how to create your own.

## Plugin Structure

A plugin is an object that implements the `EditorPlugin` interface:

```typescript
import type { EditorPlugin } from "@woven-canvas/core";

export function MyPlugin(options = {}): EditorPlugin {
  return {
    name: "my-plugin",

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

export const TaskData = defineCanvasComponent("task-data", {
  title: field.string().default("New Task"),
  description: field.string().default(""),
  completed: field.boolean().default(false),
  priority: field.enum(["low", "medium", "high"]).default("medium"),
});
```

### Field Types

| Field Type                | Description                 |
| ------------------------- | --------------------------- |
| `field.string()`          | String value                |
| `field.number()`          | Numeric value               |
| `field.boolean()`         | Boolean value               |
| `field.enum([...])`       | Enumerated string values    |
| `field.entityId()`        | Reference to another entity |
| `field.array(type, size)` | Fixed-size array            |

## Defining Block Types

Block definitions configure how blocks behave:

```typescript
blockDefs: [
  {
    tag: "task-card", // Block type identifier
    resizeMode: "free", // 'free', 'aspectRatio', or 'none'
    canRotate: true, // Allow rotation
    canScale: true, // Allow scaling
    stratum: "content", // 'content' or 'overlay'
    components: [TaskData], // Required components
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

## Defining Commands

Commands are typed actions that can be dispatched and consumed:

```typescript
import { defineCommand } from "@woven-canvas/core";

// Command with no payload
export const DoSomething = defineCommand("do-something", {});

// Command with typed payload
export const SetPriority = defineCommand("set-priority", {
  entityId: null as unknown as number,
  priority: "" as "low" | "medium" | "high",
});
```

### Dispatching Commands

```typescript
// From Vue component using useEditorContext
const { nextEditorTick } = useEditorContext();

nextEditorTick((ctx) => {
  DoSomething.spawn(ctx);
  SetPriority.spawn(ctx, { entityId, priority: "high" });
});

// Or using editor.command()
editor.command(SetPriority, { entityId, priority: "high" });
```

## Defining Systems

Systems run each frame to process commands and update state:

```typescript
import { defineEditorSystem, defineQuery } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Query for entities matching criteria
const selectedTasks = defineQuery((q) => q.with(TaskData, Selected));

// System that runs in the 'update' phase
const handlePrioritySystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  // Consume commands
  for (const cmd of SetPriority.consume(ctx)) {
    const task = TaskData.write(ctx, cmd.entityId);
    task.priority = cmd.priority;
  }
});
```

### System Phases

| Phase        | Description                   |
| ------------ | ----------------------------- |
| `preCapture` | Setup before input processing |
| `capture`    | Input handling                |
| `update`     | Main update logic             |
| `postUpdate` | Cleanup and finalization      |

## Defining Keybinds

Map keyboard shortcuts to commands:

```typescript
import { Key } from "@woven-canvas/core";

keybinds: [
  {
    command: DoSomething.name,
    key: Key.Enter,
    mod: true, // Require Ctrl/Cmd
    shift: false, // Require Shift
    alt: false, // Require Alt
  },
];
```

## Plugin Resources

Resources store plugin configuration accessible at runtime:

```typescript
import { getPluginResources } from '@woven-canvas/core'

// In plugin definition
resources: {
  defaultPriority: options.defaultPriority ?? 'medium',
  maxTasks: options.maxTasks ?? 100,
}

// Accessing in a system
const mySystem = defineEditorSystem({ phase: 'update' }, (ctx) => {
  const resources = getPluginResources<MyPluginResources>(ctx, 'my-plugin')
  console.log(resources.defaultPriority)
})
```

## Plugin Dependencies

Declare plugins your plugin depends on:

```typescript
export function MyPlugin(): EditorPlugin {
  return {
    name: "my-plugin",
    dependencies: ["selection"], // Requires SelectionPlugin
    // ...
  };
}
```

Dependencies are automatically loaded before your plugin.

## Complete Example

Here's a complete plugin that adds task cards:

```typescript
import type { EditorPlugin } from "@woven-canvas/core";
import { defineCanvasComponent, defineCommand, defineEditorSystem, defineQuery, field, Key } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

// Component
export const TaskData = defineCanvasComponent("task-data", {
  title: field.string().default("New Task"),
  completed: field.boolean().default(false),
});

// Command
export const ToggleTask = defineCommand("toggle-task", {});

// Query
const selectedTasks = defineQuery((q) => q.with(TaskData, Selected));

// System
const toggleTaskSystem = defineEditorSystem({ phase: "update" }, (ctx) => {
  for (const _cmd of ToggleTask.consume(ctx)) {
    for (const entityId of selectedTasks.current(ctx)) {
      const task = TaskData.write(ctx, entityId);
      task.completed = !task.completed;
    }
  }
});

// Plugin factory
export function TaskPlugin(): EditorPlugin {
  return {
    name: "tasks",
    dependencies: ["selection"],
    components: [TaskData],
    systems: [toggleTaskSystem],
    keybinds: [{ command: ToggleTask.name, key: Key.Enter, mod: true }],
    blockDefs: [
      {
        tag: "task-card",
        resizeMode: "free",
        canRotate: false,
        components: [TaskData],
      },
    ],
  };
}
```

## Using Your Plugin

```vue
<script setup lang="ts">
import { WovenCanvas } from "@woven-canvas/vue";
import { TaskPlugin } from "./TaskPlugin";
import TaskCard from "./TaskCard.vue";
</script>

<template>
  <WovenCanvas :editor="{ plugins: [TaskPlugin()] }">
    <template #block:task-card="props">
      <TaskCard v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

## Further Reading

For a deep dive into the Entity Component System architecture, see the [woven-ecs documentation](https://woven-ecs.dev).

See the [Custom Block](/examples/custom-block/) and [Custom Tool](/examples/custom-tool/) examples for more practical patterns.

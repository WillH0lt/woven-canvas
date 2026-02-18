---
title: "Example: Plugin"
description: Package your customizations into a reusable plugin
---

This example shows how to package the task card block, tool, and menu button into a reusable plugin that can be shared across projects.

## Plugin Structure

A plugin bundles together:
- **Components** — Custom data types
- **Block definitions** — Behavior configuration
- **Systems** — Update logic (optional)
- **Keybinds** — Keyboard shortcuts (optional)
- **Resources** — Configuration options

## Creating the Plugin

```typescript
// plugins/TaskPlugin.ts
import type { EditorPlugin } from '@woven-canvas/core'
import { defineCanvasComponent, field } from '@woven-canvas/vue'

// 1. Define the component
export const TaskData = defineCanvasComponent('task-data', {
  title: field.string().default('New Task'),
  description: field.string().default(''),
  completed: field.boolean().default(false),
  priority: field.enum(['low', 'medium', 'high']).default('medium'),
})

// 2. Plugin options interface
export interface TaskPluginOptions {
  defaultPriority?: 'low' | 'medium' | 'high'
  defaultSize?: [number, number]
}

// 3. Plugin factory
export function TaskPlugin(options: TaskPluginOptions = {}): EditorPlugin {
  return {
    name: 'tasks',

    // Register the component
    components: [TaskData],

    // Configure block behavior
    blockDefs: [
      {
        tag: 'task-card',
        resizeMode: 'free',
        canRotate: false,
        components: [TaskData],
      },
    ],

    // Store options for access in components
    resources: {
      defaultPriority: options.defaultPriority ?? 'medium',
      defaultSize: options.defaultSize ?? [240, 100],
    },
  }
}
```

## Using the Plugin

```vue
<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'
import { TaskPlugin } from './plugins/TaskPlugin'
import TaskCard from './components/TaskCard.vue'
</script>

<template>
  <WovenCanvas
    :editor="{ plugins: [TaskPlugin({ defaultPriority: 'high' })] }"
    style="width: 100vw; height: 100vh"
  >
    <template #block:task-card="props">
      <TaskCard v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

## Adding Keybinds

Add keyboard shortcuts to your plugin:

```typescript
import { Key, defineCommand } from '@woven-canvas/core'

// Define a command
export const ToggleTaskComplete = defineCommand('toggle-task-complete', {})

export function TaskPlugin(options: TaskPluginOptions = {}): EditorPlugin {
  return {
    name: 'tasks',
    components: [TaskData],
    blockDefs: [/* ... */],

    // Add keyboard shortcut
    keybinds: [
      {
        command: ToggleTaskComplete.name,
        key: Key.Enter,
        mod: true, // Ctrl/Cmd + Enter
      },
    ],

    resources: {/* ... */},
  }
}
```

## Adding Systems

Systems run each frame to process commands or update state:

```typescript
import { defineEditorSystem, defineQuery } from '@woven-canvas/core'
import { Selected } from '@woven-canvas/plugin-selection'

// Query for selected tasks
const selectedTasks = defineQuery((q) =>
  q.with(TaskData, Selected)
)

// System to handle the toggle command
const toggleCompleteSystem = defineEditorSystem(
  { phase: 'update' },
  (ctx) => {
    // Consume all toggle commands
    for (const _cmd of ToggleTaskComplete.consume(ctx)) {
      // Toggle all selected tasks
      for (const entityId of selectedTasks.current(ctx)) {
        const task = TaskData.write(ctx, entityId)
        task.completed = !task.completed
      }
    }
  }
)

export function TaskPlugin(options: TaskPluginOptions = {}): EditorPlugin {
  return {
    name: 'tasks',
    components: [TaskData],
    systems: [toggleCompleteSystem],
    keybinds: [
      { command: ToggleTaskComplete.name, key: Key.Enter, mod: true },
    ],
    blockDefs: [/* ... */],
    resources: {/* ... */},
  }
}
```

## Accessing Plugin Resources

Access your plugin's configuration from components:

```typescript
import { getPluginResources } from '@woven-canvas/core'

interface TaskPluginResources {
  defaultPriority: 'low' | 'medium' | 'high'
  defaultSize: [number, number]
}

// In a system
const mySystem = defineEditorSystem(
  { phase: 'update' },
  (ctx) => {
    const resources = getPluginResources<TaskPluginResources>(ctx, 'tasks')
    console.log('Default priority:', resources.defaultPriority)
  }
)
```

## Plugin Dependencies

If your plugin depends on others, declare them:

```typescript
export function TaskPlugin(options: TaskPluginOptions = {}): EditorPlugin {
  return {
    name: 'tasks',
    dependencies: ['selection'], // Requires SelectionPlugin

    // ... rest of plugin
  }
}
```

Dependencies are automatically loaded first.

## Complete Plugin Example

Here's the full task plugin:

```typescript
// plugins/TaskPlugin.ts
import type { EditorPlugin } from '@woven-canvas/core'
import {
  defineCanvasComponent,
  defineCommand,
  defineEditorSystem,
  defineQuery,
  field,
  Key,
} from '@woven-canvas/core'
import { Selected } from '@woven-canvas/plugin-selection'

// Component
export const TaskData = defineCanvasComponent('task-data', {
  title: field.string().default('New Task'),
  description: field.string().default(''),
  completed: field.boolean().default(false),
  priority: field.enum(['low', 'medium', 'high']).default('medium'),
})

// Command
export const ToggleTaskComplete = defineCommand('toggle-task-complete', {})

// Query
const selectedTasks = defineQuery((q) => q.with(TaskData, Selected))

// System
const toggleCompleteSystem = defineEditorSystem(
  { phase: 'update' },
  (ctx) => {
    for (const _cmd of ToggleTaskComplete.consume(ctx)) {
      for (const entityId of selectedTasks.current(ctx)) {
        const task = TaskData.write(ctx, entityId)
        task.completed = !task.completed
      }
    }
  }
)

// Options
export interface TaskPluginOptions {
  defaultPriority?: 'low' | 'medium' | 'high'
  defaultSize?: [number, number]
}

// Plugin factory
export function TaskPlugin(options: TaskPluginOptions = {}): EditorPlugin {
  return {
    name: 'tasks',
    dependencies: ['selection'],
    components: [TaskData],
    systems: [toggleCompleteSystem],
    keybinds: [
      { command: ToggleTaskComplete.name, key: Key.Enter, mod: true },
    ],
    blockDefs: [
      {
        tag: 'task-card',
        resizeMode: 'free',
        canRotate: false,
        components: [TaskData],
      },
    ],
    resources: {
      defaultPriority: options.defaultPriority ?? 'medium',
      defaultSize: options.defaultSize ?? [240, 100],
    },
  }
}
```

## Distributing Your Plugin

To share your plugin as an npm package:

1. Create a package with the plugin code
2. Export the plugin factory and any components/commands
3. Users install and use it:

```typescript
import { TaskPlugin, TaskData } from '@my-org/woven-canvas-tasks'

// Use with WovenCanvas
<WovenCanvas :editor="{ plugins: [TaskPlugin()] }" />
```

---
title: "Example: Custom Block"
description: Build a task card block from scratch
---

This example walks through creating a custom "task card" block with its own data, rendering, and behavior.

## What We're Building

A task card block that displays:
- A title and description
- A priority indicator (low/medium/high)
- A completion checkbox
- Visual feedback when selected

## Step 1: Define the Component

First, create a canvas component to store task data:

```typescript
// components/TaskData.ts
import { defineCanvasComponent, field } from '@woven-canvas/vue'

export const TaskData = defineCanvasComponent('task-data', {
  title: field.string().default('New Task'),
  description: field.string().default(''),
  completed: field.boolean().default(false),
  priority: field.enum(['low', 'medium', 'high']).default('medium'),
})
```

## Step 2: Create the Block Component

Create a Vue component to render the task card:

```vue
<!-- components/TaskCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useComponent, useEditorContext } from '@woven-canvas/vue'
import { TaskData } from './TaskData'

const props = defineProps<{
  entityId: number
  selected: boolean
}>()

// Subscribe to task data reactively
const task = useComponent(props.entityId, TaskData)

// Get editor context for writes
const { nextEditorTick } = useEditorContext()

// Toggle completion
function toggleComplete() {
  nextEditorTick((ctx) => {
    const t = TaskData.write(ctx, props.entityId)
    t.completed = !t.completed
  })
}

// Priority colors
const priorityColors = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
}

const style = computed(() => ({
  width: '100%',
  height: '100%',
  backgroundColor: task.value?.completed ? '#f0fdf4' : '#ffffff',
  border: props.selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
  pointerEvents: 'auto' as const,
}))
</script>

<template>
  <div :style="style">
    <div style="display: flex; align-items: center; gap: 8px">
      <input
        type="checkbox"
        :checked="task?.completed"
        @change="toggleComplete"
        @pointerdown.stop
      />
      <span
        :style="{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: priorityColors[task?.priority ?? 'medium'],
        }"
      />
      <strong :style="{ textDecoration: task?.completed ? 'line-through' : 'none' }">
        {{ task?.title }}
      </strong>
    </div>
    <p style="margin: 0; color: #6b7280; font-size: 14px">
      {{ task?.description }}
    </p>
  </div>
</template>
```

## Step 3: Register with WovenCanvas

Wire everything together:

```vue
<!-- App.vue -->
<script setup lang="ts">
import { WovenCanvas } from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { TaskData } from './components/TaskData'
import TaskCard from './components/TaskCard.vue'

// Block definition for task cards
const blockDefs = [
  {
    tag: 'task-card',
    resizeMode: 'free' as const,
    canRotate: false,
    components: [TaskData],
  },
]
</script>

<template>
  <WovenCanvas
    :editor="{ components: [TaskData], blockDefs }"
    style="width: 100vw; height: 100vh"
  >
    <template #block:task-card="props">
      <TaskCard :entity-id="props.entityId" :selected="props.selected" />
    </template>
  </WovenCanvas>
</template>
```

## Step 4: Add a Tool (Optional)

Create a toolbar button to add task cards:

```vue
<!-- components/TaskTool.vue -->
<script setup lang="ts">
import { ToolbarButton } from '@woven-canvas/vue'

const snapshot = JSON.stringify({
  block: {
    tag: 'task-card',
    size: [240, 100],
  },
  'task-data': {
    title: 'New Task',
    description: 'Click to edit',
    completed: false,
    priority: 'medium',
  },
})
</script>

<template>
  <ToolbarButton
    name="task"
    tooltip="Task Card"
    :placement-snapshot="snapshot"
    :drag-out-snapshot="snapshot"
  >
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  </ToolbarButton>
</template>
```

Add it to a custom toolbar:

```vue
<template>
  <WovenCanvas :editor="{ components: [TaskData], blockDefs }">
    <template #toolbar>
      <div class="toolbar">
        <SelectTool />
        <HandTool />
        <TaskTool />
      </div>
    </template>

    <template #block:task-card="props">
      <TaskCard v-bind="props" />
    </template>
  </WovenCanvas>
</template>
```

## Complete Example

Here's the full working code:

```vue
<script setup lang="ts">
import {
  WovenCanvas,
  ToolbarButton,
  SelectTool,
  HandTool,
  useComponent,
  useEditorContext,
  defineCanvasComponent,
  field,
} from '@woven-canvas/vue'
import '@woven-canvas/vue/style.css'
import { computed } from 'vue'

// 1. Define component
const TaskData = defineCanvasComponent('task-data', {
  title: field.string().default('New Task'),
  description: field.string().default(''),
  completed: field.boolean().default(false),
  priority: field.enum(['low', 'medium', 'high']).default('medium'),
})

// 2. Block definition
const blockDefs = [
  { tag: 'task-card', resizeMode: 'free' as const, canRotate: false, components: [TaskData] },
]

// 3. Tool snapshot
const taskSnapshot = JSON.stringify({
  block: { tag: 'task-card', size: [240, 100] },
  'task-data': { title: 'New Task', description: 'Click to edit', completed: false, priority: 'medium' },
})
</script>

<template>
  <WovenCanvas
    :editor="{ components: [TaskData], blockDefs }"
    style="width: 100vw; height: 100vh"
  >
    <template #toolbar>
      <div style="display: flex; gap: 4px; padding: 8px; background: #374151; border-radius: 8px">
        <SelectTool />
        <HandTool />
        <ToolbarButton name="task" tooltip="Task" :placement-snapshot="taskSnapshot" :drag-out-snapshot="taskSnapshot">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 10l2 2 4-4" />
          </svg>
        </ToolbarButton>
      </div>
    </template>

    <template #block:task-card="{ entityId, selected }">
      <TaskCardInline :entity-id="entityId" :selected="selected" />
    </template>
  </WovenCanvas>
</template>
```

## Next Steps

- [Custom Tool](/examples/custom-tool/) — More tool customization options
- [Custom Floating Menu](/examples/custom-floating-menu/) — Add a priority picker to the floating menu
- [Plugin](/examples/plugin/) — Package this into a reusable plugin

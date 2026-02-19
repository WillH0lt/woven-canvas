---
title: "Example: Custom Floating Menu"
description: Add context menu options for your block types
---

This example shows how to add custom buttons to the floating menu that appears when blocks are selected. We'll add a priority picker for task cards.

## Adding a Custom Button

The floating menu automatically shows buttons for components that selected blocks have in common. Add your own via slots:

```vue
<script setup lang="ts">
import { WovenCanvas, FloatingMenuBar } from "@woven-canvas/vue";
import TaskPriorityButton from "./TaskPriorityButton.vue";
</script>

<template>
  <WovenCanvas>
    <template #floating-menu>
      <FloatingMenuBar>
        <!-- Add button for task-data component -->
        <template #button:task-data="{ entityIds }">
          <TaskPriorityButton :entity-ids="entityIds" />
        </template>
      </FloatingMenuBar>
    </template>
  </WovenCanvas>
</template>
```

The slot name follows the pattern `button:<component-name>`. It only appears when all selected blocks have that component.

## Building the Priority Button

```vue
<!-- TaskPriorityButton.vue -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { MenuButton, MenuDropdown, useEditorContext, useComponents } from "@woven-canvas/vue";
import { TaskData } from "./TaskData";

const props = defineProps<{
  entityIds: number[];
}>();

// Get task data for all selected entities
const tasks = useComponents(props.entityIds, TaskData);

// Compute current priority (use first if mixed)
const currentPriority = computed(() => {
  const priorities = tasks.value.filter((t): t is NonNullable<typeof t> => t !== null).map((t) => t.priority);

  if (priorities.length === 0) return "medium";
  const allSame = priorities.every((p) => p === priorities[0]);
  return allSame ? priorities[0] : "mixed";
});

// Dropdown state
const isOpen = ref(false);

// Editor context for writes
const { nextEditorTick } = useEditorContext();

function setPriority(priority: "low" | "medium" | "high") {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      const task = TaskData.write(ctx, entityId);
      task.priority = priority;
    }
  });
  isOpen.value = false;
}

const priorityColors = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
  mixed: "#9ca3af",
};
</script>

<template>
  <MenuButton tooltip="Priority" :menu-open="isOpen" @click="isOpen = !isOpen">
    <div
      :style="{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: priorityColors[currentPriority],
      }"
    />

    <MenuDropdown v-if="isOpen" @close="isOpen = false">
      <button
        v-for="priority in ['low', 'medium', 'high'] as const"
        :key="priority"
        class="ic-menu-option"
        :class="{ 'is-active': currentPriority === priority }"
        @click="setPriority(priority)"
      >
        <div
          :style="{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: priorityColors[priority],
          }"
        />
      </button>
    </MenuDropdown>
  </MenuButton>
</template>
```

## Overriding Built-in Buttons

Replace the default buttons for built-in components:

```vue
<template>
  <WovenCanvas>
    <template #floating-menu>
      <FloatingMenuBar>
        <!-- Replace the color button -->
        <template #button:color="{ entityIds }">
          <MySimpleColorButton :entity-ids="entityIds" />
        </template>

        <!-- Replace text formatting -->
        <template #button:text="{ entityIds }">
          <MyTextButtons :entity-ids="entityIds" />
        </template>

        <!-- Hide shape buttons entirely -->
        <template #button:shape />
      </FloatingMenuBar>
    </template>
  </WovenCanvas>
</template>
```

## Available Button Slots

| Slot                    | Component(s)             | Description              |
| ----------------------- | ------------------------ | ------------------------ |
| `button:color`          | `color`                  | Fill color picker        |
| `button:shape`          | `shape`                  | Shape kind, fill, stroke |
| `button:text`           | `text`                   | All text formatting      |
| `button:penStroke`      | `penStroke`              | Stroke thickness         |
| `button:arrowThickness` | `arcArrow`, `elbowArrow` | Line thickness           |
| `button:arrowHeadStart` | `arcArrow`, `elbowArrow` | Start arrow style        |
| `button:arrowHeadEnd`   | `arcArrow`, `elbowArrow` | End arrow style          |

## Building a Complete Button

Here's a more complete example with tooltip support:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { MenuButton, MenuDropdown, useEditorContext, useComponents, useTooltipSingleton } from "@woven-canvas/vue";
import { TaskData } from "./TaskData";

const props = defineProps<{ entityIds: number[] }>();

const tasks = useComponents(props.entityIds, TaskData);
const { nextEditorTick } = useEditorContext();
const { show: showTooltip, hide: hideTooltip } = useTooltipSingleton();

const isOpen = ref(false);

const currentPriority = computed(() => {
  const priorities = tasks.value.filter(Boolean).map((t) => t!.priority);
  if (priorities.length === 0) return "medium";
  return priorities.every((p) => p === priorities[0]) ? priorities[0] : "mixed";
});

function setPriority(priority: "low" | "medium" | "high") {
  nextEditorTick((ctx) => {
    for (const entityId of props.entityIds) {
      TaskData.write(ctx, entityId).priority = priority;
    }
  });
  isOpen.value = false;
}

const colors = { low: "#22c55e", medium: "#eab308", high: "#ef4444", mixed: "#9ca3af" };
const labels = { low: "Low", medium: "Medium", high: "High" };

function handleMouseEnter(event: MouseEvent, text: string) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  showTooltip(text, rect.left + rect.width / 2, rect.top);
}
</script>

<template>
  <MenuButton
    :tooltip="'Priority: ' + (labels[currentPriority] ?? 'Mixed')"
    :menu-open="isOpen"
    @click="isOpen = !isOpen"
  >
    <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: colors[currentPriority] }" />

    <MenuDropdown v-if="isOpen" @close="isOpen = false">
      <button
        v-for="p in ['low', 'medium', 'high'] as const"
        :key="p"
        class="ic-menu-option"
        @click="setPriority(p)"
        @mouseenter="handleMouseEnter($event, labels[p])"
        @mouseleave="hideTooltip"
      >
        <div :style="{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: colors[p] }" />
      </button>
    </MenuDropdown>
  </MenuButton>
</template>
```

## Completely Custom Menu

Replace the entire floating menu:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@woven-canvas/vue";
import { Block } from "@woven-canvas/core";
import { Selected } from "@woven-canvas/plugin-selection";

const selected = useQuery([Block, Selected] as const);
const hasSelection = computed(() => selected.value.length > 0);
</script>

<template>
  <WovenCanvas>
    <template #floating-menu>
      <div v-if="hasSelection" class="my-menu">
        <button @click="deleteSelected">Delete</button>
        <button @click="duplicateSelected">Duplicate</button>
      </div>
    </template>
  </WovenCanvas>
</template>
```

## Next Steps

- [Plugin](/examples/plugin/) — Package everything into a reusable plugin

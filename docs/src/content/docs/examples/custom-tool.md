---
title: "Example: Custom Tool"
description: Create a toolbar button that adds your block type
---

This example shows how to create a custom tool that adds blocks to the canvas. We'll build on the task card from the [Custom Block example](/examples/custom-block/).

## Basic Tool

The simplest tool uses `ToolbarButton` with a snapshot:

```vue
<script setup lang="ts">
import { ToolbarButton } from "@woven-canvas/vue";

const snapshot = JSON.stringify({
  block: {
    tag: "task-card",
    size: [240, 100],
  },
  "task-data": {
    title: "New Task",
    description: "",
    completed: false,
    priority: "medium",
  },
});
</script>

<template>
  <ToolbarButton name="task" tooltip="Task Card" :placement-snapshot="snapshot" :drag-out-snapshot="snapshot">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  </ToolbarButton>
</template>
```

This creates a tool that:

- Shows a tooltip on hover
- Creates a task card when clicked on canvas
- Creates a task card when dragged onto canvas

## Tool with Custom Cursor

Set a cursor that appears when the tool is active:

```vue
<script setup lang="ts">
import { ToolbarButton, CursorKind } from "@woven-canvas/vue";
</script>

<template>
  <ToolbarButton
    name="task"
    tooltip="Task Card"
    :cursor="CursorKind.Crosshair"
    :placement-snapshot="snapshot"
    :drag-out-snapshot="snapshot"
  >
    <!-- icon -->
  </ToolbarButton>
</template>
```

## Tool with Lifecycle Hooks

Run code when the tool is activated or deactivated:

```vue
<script setup lang="ts">
import { watch } from "vue";
import { ToolbarButton, useToolbar, useEditorContext } from "@woven-canvas/vue";

const { activeTool } = useToolbar();
const { nextEditorTick } = useEditorContext();

watch(activeTool, (newTool, oldTool) => {
  if (newTool === "task") {
    console.log("Task tool activated!");
    // Maybe show a hint or change UI
  }

  if (oldTool === "task") {
    console.log("Task tool deactivated");
    // Clean up any temporary state
  }
});
</script>

<template>
  <ToolbarButton name="task" tooltip="Task Card" :placement-snapshot="snapshot">
    <!-- icon -->
  </ToolbarButton>
</template>
```

## Tool with Options Dropdown

Create a tool that shows options before placing:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { ToolbarButton, MenuDropdown } from "@woven-canvas/vue";

const priority = ref<"low" | "medium" | "high">("medium");
const showOptions = ref(false);

const snapshot = computed(() =>
  JSON.stringify({
    block: {
      tag: "task-card",
      size: [240, 100],
    },
    "task-data": {
      title: "New Task",
      description: "",
      completed: false,
      priority: priority.value,
    },
  }),
);

const priorityColors = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};
</script>

<template>
  <div style="position: relative">
    <ToolbarButton
      name="task"
      tooltip="Task Card"
      :placement-snapshot="snapshot"
      :drag-out-snapshot="snapshot"
      @contextmenu.prevent="showOptions = !showOptions"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 10l2 2 4-4" />
      </svg>
      <div
        :style="{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: priorityColors[priority],
        }"
      />
    </ToolbarButton>

    <MenuDropdown v-if="showOptions" @close="showOptions = false">
      <button
        v-for="p in ['low', 'medium', 'high']"
        :key="p"
        class="ic-menu-option"
        @click="
          priority = p;
          showOptions = false;
        "
      >
        <div
          :style="{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: priorityColors[p],
          }"
        />
      </button>
    </MenuDropdown>
  </div>
</template>
```

## Adding to the Toolbar

Replace the entire toolbar with your custom tools:

```vue
<template>
  <WovenCanvas>
    <template #toolbar>
      <div class="my-toolbar">
        <!-- Built-in tools -->
        <SelectTool />
        <HandTool />
        <ShapeTool />
        <TextTool />

        <!-- Divider -->
        <div class="divider" />

        <!-- Your custom tools -->
        <TaskTool />
        <NoteTool />
      </div>
    </template>
  </WovenCanvas>
</template>

<style>
.my-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #374151;
  border-radius: 8px;
  position: absolute;
  bottom: 16px;
  left: 16px;
}

.divider {
  width: 1px;
  background: #4b5563;
  margin: 4px 4px;
}
</style>
```

## Multiple Block Sizes

Create a tool that supports different sizes:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { ToolbarButton } from "@woven-canvas/vue";

type Size = "small" | "medium" | "large";
const size = ref<Size>("medium");

const sizes = {
  small: [160, 80],
  medium: [240, 100],
  large: [320, 140],
};

const snapshot = computed(() =>
  JSON.stringify({
    block: {
      tag: "task-card",
      size: sizes[size.value],
    },
    "task-data": {
      title: "New Task",
      description: "",
      completed: false,
      priority: "medium",
    },
  }),
);
</script>

<template>
  <ToolbarButton
    name="task"
    tooltip="Task Card (right-click for sizes)"
    :placement-snapshot="snapshot"
    :drag-out-snapshot="snapshot"
  >
    <!-- icon -->
  </ToolbarButton>
</template>
```

## Next Steps

- [Custom Floating Menu](/examples/custom-floating-menu/) — Add menu options for your block
- [Plugin](/examples/plugin/) — Package the tool into a plugin

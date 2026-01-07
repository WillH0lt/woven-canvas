# Floating Menu Migration Plan (floating-ui Approach)

## Overview

Migrate the floating menu system from `packages/core` to `packages/vue` using **floating-ui for all positioning**. No ECS systems needed - the menu is a pure Vue component that positions itself relative to the selection bounds.

## Key Difference from PLAN.md

| Aspect          | PLAN.md (Block Entity)            | This Plan (floating-ui)            |
| --------------- | --------------------------------- | ---------------------------------- |
| Menu entity     | ECS Block entity                  | Pure Vue component                 |
| Positioning     | ECS system updates Block.position | floating-ui `useFloating()`        |
| Render path     | Through block rendering loop      | Separate overlay layer             |
| Systems needed  | 2 (lifecycle + position)          | 0                                  |
| Camera tracking | Automatic (Block transform)       | Manual (virtual reference element) |

## Design Goals

1. **No ECS systems** - All logic lives in Vue components
2. **floating-ui handles positioning** - Use virtual reference element for selection bounds
3. **Component-based button registration** - Plugins declare which buttons appear for which components
4. **Slot-based customization** - Users can override any component's buttons via named slots
5. **Filter by selectedBy** - Multi-user support
6. **Fade animations** - Smooth visibility transitions

## User-Facing API

Same as PLAN.md - the API is identical:

### Basic Usage (Default Buttons)

```vue
<InfiniteCanvas>
  <template #sticky-note="{ entityId }">
    <StickyNote :entityId="entityId" />
  </template>
</InfiniteCanvas>
```

### Partial Override (Customize Specific Component Buttons)

```vue
<InfiniteCanvas>
  <template #floating-menu="{ selectedIds, commonComponents }">
    <FloatingMenuBar :selectedIds="selectedIds" :commonComponents="commonComponents">
      <template #color="{ entityIds }">
        <MyCustomColorButton :entityIds="entityIds" />
      </template>
    </FloatingMenuBar>
  </template>
</InfiniteCanvas>
```

## Architecture

### 1. No Plugin Needed

Since there are no ECS components or systems, we don't need a plugin. The floating menu is just Vue components rendered by `InfiniteCanvas.vue`.

### 2. FloatingMenu.vue

The main component that:

- Queries selected blocks using `useQuery`
- Computes common components
- Uses floating-ui to position relative to selection bounds
- Renders the menu bar

```vue
<!-- packages/vue/src/components/FloatingMenu.vue -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/vue";
import { defineQuery, Block, Selected } from "@infinitecanvas/editor";
import { useQuery } from "../composables/useQuery";
import { useSingleton } from "../composables/useSingleton";
import { Camera } from "@infinitecanvas/editor";
import FloatingMenuBar from "./FloatingMenuBar.vue";

// Props for user ID filtering
const props = defineProps<{
  userId: string;
}>();

// Query all selected blocks
const selectedQuery = defineQuery((q) => q.with(Block, Selected));
const selectedItems = useQuery(selectedQuery);

// Get camera for coordinate transforms
const camera = useSingleton(Camera);

// Filter to only blocks selected by current user
const mySelectedItems = computed(() =>
  selectedItems.value.filter(
    (item) => item.selected?.selectedBy === props.userId
  )
);

const selectedIds = computed(() =>
  mySelectedItems.value.map((item) => item.entityId)
);

// Compute common components across selection
const commonComponents = computed(() => {
  if (mySelectedItems.value.length === 0) return new Set<string>();

  // Get component names from first selected block's blockDef
  // Then intersect with all other selected blocks
  // (Implementation details omitted for brevity)
  return new Set(["color"]); // Placeholder
});

// Compute selection bounds in screen coordinates
const selectionBounds = computed(() => {
  if (mySelectedItems.value.length === 0) return null;

  const cam = camera.value;
  if (!cam) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const item of mySelectedItems.value) {
    const block = item.block;
    const left = (block.position[0] - cam.left) * cam.zoom;
    const top = (block.position[1] - cam.top) * cam.zoom;
    const right = left + block.size[0] * cam.zoom;
    const bottom = top + block.size[1] * cam.zoom;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  return { left: minX, top: minY, right: maxX, bottom: maxY };
});

// Virtual reference element for floating-ui
// This represents the selection bounding box
const virtualReference = computed(() => {
  const bounds = selectionBounds.value;
  if (!bounds) return null;

  return {
    getBoundingClientRect() {
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.right - bounds.left,
        height: bounds.bottom - bounds.top,
        top: bounds.top,
        left: bounds.left,
        right: bounds.right,
        bottom: bounds.bottom,
      };
    },
  };
});

// Floating menu element ref
const floatingRef = ref<HTMLElement | null>(null);

// Use floating-ui for positioning
const { floatingStyles, placement } = useFloating(
  virtualReference,
  floatingRef,
  {
    placement: "top",
    middleware: [
      offset(12), // Gap between selection and menu
      flip({
        fallbackPlacements: ["bottom"],
      }),
      shift({ padding: 8 }), // Keep menu within viewport
    ],
    whileElementsMounted: autoUpdate, // Reposition on scroll/resize
  }
);

// Visibility state
const isVisible = computed(() => mySelectedItems.value.length > 0);

// Check if selection is off-screen (hide menu)
const isOffScreen = computed(() => {
  const bounds = selectionBounds.value;
  if (!bounds) return true;

  // Get container dimensions (could use Screen singleton or measure DOM)
  const containerWidth = window.innerWidth; // Simplified
  return bounds.right < 0 || bounds.left > containerWidth;
});

const shouldShow = computed(() => isVisible.value && !isOffScreen.value);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="shouldShow"
        ref="floatingRef"
        class="ic-floating-menu"
        :style="floatingStyles"
      >
        <slot :selectedIds="selectedIds" :commonComponents="commonComponents">
          <FloatingMenuBar
            :selectedIds="selectedIds"
            :commonComponents="commonComponents"
          />
        </slot>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ic-floating-menu {
  position: absolute;
  z-index: 1000;
  pointer-events: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 3. FloatingMenuBar.vue

Same as PLAN.md - renders buttons based on common components with slot overrides.

```vue
<!-- packages/vue/src/components/FloatingMenuBar.vue -->
<script setup lang="ts">
import { computed, useSlots } from "vue";
import ColorButton from "./buttons/ColorButton.vue";
import Divider from "./buttons/Divider.vue";
import DeleteButton from "./buttons/DeleteButton.vue";

const props = defineProps<{
  selectedIds: string[];
  commonComponents: Set<string>;
}>();

// Built-in button definitions, ordered by priority
const builtInButtons = [
  { component: "color", order: 10, default: ColorButton },
  // Add more built-in buttons here
];

// Filter to only components present in selection
const activeButtons = computed(() =>
  builtInButtons
    .filter((b) => props.commonComponents.has(b.component))
    .sort((a, b) => a.order - b.order)
);
</script>

<template>
  <div class="ic-floating-menu-bar">
    <template v-for="(button, index) in activeButtons" :key="button.component">
      <Divider v-if="index > 0" />

      <!-- Allow slot override, fall back to default component -->
      <slot :name="button.component" :entityIds="selectedIds">
        <component :is="button.default" :entityIds="selectedIds" />
      </slot>
    </template>
  </div>
</template>

<style>
.ic-floating-menu-bar {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  gap: 2px;
}
</style>
```

### 4. Integration with InfiniteCanvas.vue

Add the FloatingMenu component outside the block rendering loop:

```vue
<!-- In InfiniteCanvas.vue -->
<script setup>
import FloatingMenu from "./FloatingMenu.vue";

// ... existing code ...

// Get userId from editor resources
const userId = computed(() => editorRef.value?._getContext().resources.userId);
</script>

<template>
  <div ref="containerRef" class="ic-container">
    <!-- Block rendering loop (existing) -->
    <div
      v-for="itemRef in sortedBlocks"
      :key="itemRef.value.entityId"
      :style="getBlockStyle(itemRef.value)"
    >
      <!-- ... existing slot logic ... -->
    </div>

    <!-- Floating menu (new) - rendered separately, not as a block -->
    <FloatingMenu v-if="editorRef" :userId="userId">
      <template #color>
        <ColorMenuButton />
      </template>
    </FloatingMenu>
  </div>
</template>
```

### 5. Computing Common Components

We need to determine which components are shared across all selected blocks. This can be done by:

1. Looking up each block's `tag` in `editor.blockDefs`
2. Getting the component list from the block definition
3. Intersecting across all selected blocks

```typescript
// packages/vue/src/utils/computeCommonComponents.ts

import type { Editor } from "@infinitecanvas/editor";

export function computeCommonComponents(
  editor: Editor,
  selectedBlocks: Array<{ block: { tag: string } }>
): Set<string> {
  if (selectedBlocks.length === 0) return new Set();

  // Get components for first block
  const firstTag = selectedBlocks[0].block.tag;
  const firstDef = editor.blockDefs[firstTag];
  if (!firstDef) return new Set();

  const common = new Set(firstDef.components.map((c) => c.name));

  // Intersect with remaining blocks
  for (let i = 1; i < selectedBlocks.length; i++) {
    const tag = selectedBlocks[i].block.tag;
    const def = editor.blockDefs[tag];
    if (!def) {
      common.clear();
      break;
    }

    const componentNames = new Set(def.components.map((c) => c.name));
    for (const name of common) {
      if (!componentNames.has(name)) {
        common.delete(name);
      }
    }
  }

  return common;
}
```

## Comparison: Pros and Cons

### Advantages of floating-ui Approach

1. **Simpler architecture** - No ECS systems, no FloatingMenuData component
2. **Less code** - No lifecycle/position systems to maintain
3. **Familiar patterns** - Standard Vue + floating-ui, no ECS knowledge needed
4. **Immediate updates** - No frame delay between selection change and menu update
5. **Easier styling** - CSS transitions work naturally with Vue's `<Transition>`
6. **Teleport flexibility** - Can render menu anywhere in DOM tree

### Disadvantages

1. **Manual camera tracking** - Must subscribe to Camera changes and recompute bounds
2. **Separate render path** - Menu isn't part of block rendering, might feel inconsistent
3. **No ECS benefits** - Can't query/modify menu via ECS patterns
4. **Performance** - Recomputes bounds on every selection/camera change (though this is probably fine)

### When to Choose This Approach

- If you want **maximum simplicity** and minimal ECS coupling
- If the menu **never needs to be treated as an entity** (saved, synced, etc.)
- If you're comfortable with **Vue handling all the logic**

### When to Choose PLAN.md (Block Entity)

- If you want **consistency** - everything is an entity
- If menu might need **ECS features** later (save state, plugins modify it, etc.)
- If you prefer **systems-based architecture** throughout

## Implementation Steps

### Phase 1: Core Components

1. [ ] Create `FloatingMenu.vue` with floating-ui positioning
2. [ ] Create `FloatingMenuBar.vue` with slot support
3. [ ] Create `computeCommonComponents` utility
4. [ ] Integrate FloatingMenu into `InfiniteCanvas.vue`

### Phase 2: Built-in Buttons

5. [ ] Create `MenuButton.vue` - base button with tooltip
6. [ ] Create `ColorButton.vue` with color picker dropdown
7. [ ] Create `ColorPicker.vue` - palette component

### Phase 3: Polish

10. [ ] Add fade animations via Vue `<Transition>`
11. [ ] Handle viewport edge cases
12. [ ] Ensure proper z-indexing
13. [ ] Test multi-user filtering

## File Structure

```
packages/vue/src/
├── components/
│   ├── FloatingMenu.vue             # Main menu with floating-ui
│   ├── FloatingMenuBar.vue          # Button container with slots
│   └── buttons/
│       ├── MenuButton.vue           # Base button
│       ├── ColorButton.vue          # Color picker trigger
│       ├── ColorPicker.vue          # Color palette dropdown
├── utils/
│   └── computeCommonComponents.ts   # Component intersection logic
└── index.ts                         # Exports
```

## Dependencies

- `@floating-ui/vue` - For menu and dropdown positioning
- Existing: `@infinitecanvas/editor`, `vue`

## Handling Rotation and Zoom

### Rotation Challenge

When blocks are rotated, their axis-aligned bounding box (AABB) is larger than the visual bounds. We need to compute the **rotated corners** and find their screen-space bounding box.

Use methods in @infinitecanvas/math library

### Zoom Challenge

The menu should maintain a **fixed screen size** regardless of zoom level. This is handled naturally since:

- We compute bounds in **screen coordinates** (already multiplied by zoom)
- The menu itself is rendered via Teleport, outside the zoomed canvas
- floating-ui positions in screen pixels

### Camera Pan

When the camera pans, selection bounds change in screen space. floating-ui's `autoUpdate` handles this by repositioning on scroll/resize, but we also need to trigger updates when the camera singleton changes.

```typescript
// Watch camera changes to trigger floating-ui repositioning
const camera = useSingleton(Camera);

// The virtualReference is a computed that depends on camera
// So it automatically updates when camera changes
const virtualReference = computed(() => {
  const cam = camera.value;
  if (!cam) return null;
  // ... compute bounds using cam
});
```

### Edge Cases

1. **Selection entirely off-screen**: Hide menu completely
2. **Selection partially off-screen**: floating-ui's `shift` keeps menu visible
3. **Menu would overlap selection**: `flip` moves it below
4. **Very zoomed out**: Menu stays readable (fixed screen size)
5. **Very zoomed in**: Menu still fits, shift prevents overflow

## Open Questions

1. **Container reference**: floating-ui needs coordinates relative to a container.

   - Answer - Pass container ref from InfiniteCanvas

2. **Performance**: Is recomputing bounds on every tick acceptable, or should we debounce/throttle?

   - Answer - Yes.

3. **Button registration**: Without a plugin, how do custom buttons get registered?
   - Answer - Just use slots (current approach - most Vue-native)
